<?php

namespace App\Http\Controllers;

use App\Models\Pago;
use App\Models\Postulante;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Stripe\Checkout\Session as StripeSession;
use Stripe\Stripe;
use Stripe\Webhook;

class PagoController extends Controller
{
    /**
     * CU07: Crear sesion de pago Stripe
     *
     * Seq_CU07: Postulante → IU_Inscripcion → CTR_Inscripcion.crearSesionPago()
     *   → verificar requisitos completos → PasarelaStripe.crearSesion()
     *   → retornar URL de checkout
     */
    public function crearSesion(Postulante $postulante): JsonResponse
    {
        if ($postulante->estado !== 'Verificado') {
            return response()->json([
                'message' => 'El postulante debe estar verificado antes de pagar. Estado actual: ' . $postulante->estado,
            ], 422);
        }

        $requisitos = $postulante->requisitos;
        if (! $requisitos || ! $requisitos->todosVerificados()) {
            return response()->json([
                'message' => 'Requisitos documentales incompletos.',
            ], 422);
        }

        // Verificar si ya tiene un pago exitoso
        $pagoExistente = $postulante->pagos()->where('estado_pago', 'Succeeded')->exists();
        if ($pagoExistente) {
            return response()->json([
                'message' => 'El postulante ya realizo el pago exitosamente.',
            ], 422);
        }

        Stripe::setApiKey(config('services.stripe.secret'));

        $session = StripeSession::create([
            'payment_method_types' => ['card'],
            'line_items' => [[
                'price_data' => [
                    'currency' => 'bob',
                    'product_data' => [
                        'name' => 'Matricula CUP FICCT - Gestion ' . $postulante->gestion->codigo,
                    ],
                    'unit_amount' => (int) (config('services.stripe.monto_matricula', 350) * 100),
                ],
                'quantity' => 1,
            ]],
            'mode' => 'payment',
            'success_url' => config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:5173'))
                . '/inscripcion/exitosa?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:5173'))
                . '/inscripcion/cancelada',
            'metadata' => [
                'postulante_id' => $postulante->id,
                'ci' => $postulante->ci,
            ],
        ]);

        return response()->json([
            'checkout_url' => $session->url,
            'session_id' => $session->id,
        ]);
    }

    /**
     * CU07: Webhook Stripe (confirma pago asincrono)
     *
     * Seq_CU07: Stripe → CTR_Inscripcion.webhookPago()
     *   → CE_Pago.registrar() → CE_Postulante.cambiarEstado("Inscrito")
     */
    public function webhook(Request $request): JsonResponse
    {
        $payload = $request->getContent();
        $signature = $request->header('Stripe-Signature');

        try {
            $event = Webhook::constructEvent(
                $payload,
                $signature,
                config('services.stripe.webhook_secret')
            );
        } catch (\Exception $e) {
            return response()->json(['error' => 'Webhook signature invalida.'], 400);
        }

        if ($event->type === 'checkout.session.completed') {
            $session = $event->data->object;
            $postulanteId = $session->metadata->postulante_id ?? null;

            if ($postulanteId) {
                Pago::create([
                    'postulante_id' => $postulanteId,
                    'stripe_checkout_id' => $session->id,
                    'monto' => $session->amount_total / 100,
                    'estado_pago' => 'Succeeded',
                ]);

                Postulante::where('id', $postulanteId)->update(['estado' => 'Inscrito']);
            }
        }

        return response()->json(['received' => true]);
    }

    /**
     * Verificar estado de pago por session_id (para frontend post-redirect)
     */
    public function verificarPago(Request $request): JsonResponse
    {
        $request->validate(['session_id' => 'required|string']);

        $pago = Pago::where('stripe_checkout_id', $request->session_id)->first();

        if (! $pago) {
            return response()->json(['pagado' => false, 'message' => 'Pago no encontrado o pendiente.']);
        }

        return response()->json([
            'pagado' => $pago->estado_pago === 'Succeeded',
            'pago' => $pago,
            'postulante' => $pago->postulante,
        ]);
    }
}
