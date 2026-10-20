# 📁 Comprobantes de Ejemplo para Pruebas del Asistente IA (n8n + POO)

Esta carpeta contiene los archivos físicos correspondientes a los **Presets de Prueba Rápida** de la aplicación web:

![Presets de Prueba](media_1792528683530.png)

---

## 📄 Archivos PDF Generados (Listos para Arrastrar y Soltar)

| Archivo | Preset Asociado | Caso de Prueba | Comportamiento Esperado |
| :--- | :--- | :--- | :--- |
| **`1_factura_valida_papeleria.pdf`** | ✅ **Factura Válida (Cuadra <50K)** | Factura estándar de *Papelería López S.A.* por ₡1.392 CRC. Folio `A-8835`. | La suma cuadra (1200 + 192 = 1392), proveedor al día y monto < 50.000 CRC. **Se aprueba y registra automáticamente** en `db.json` y se programa el pago. |
| **`2_error_aritmetico_papeleria.pdf`** | ❌ **Error Aritmético (Rechazo Código)** | Factura alterada de *Papelería López S.A.* con Folio `ERR-FRAUDE-99`. Subtotal ₡1.200 + IVA ₡192 = ₡1.392, pero el total impreso es ₡2.000. | **Rechazada de inmediato** por validación determinista en código. Se registra log de error en `db.json` y no se agenda pago. |
| **`3_monto_alto_cloudtech.pdf`** | ⚠️ **Monto Alto (>50K Aprobación)** | Factura de *Servicios de Nube y Redes CloudTech S.A.* con Folio `CLOUD-2026-X1`. Total: ₡69.600 CRC. | La suma cuadra, pero al superar el umbral de ₡50.000 CRC se marca como **`requiere_aprobacion: true`** y queda en estado `pendiente_aprobacion`. |
| **`4_proveedor_moroso_distribuidora.pdf`** | 🚨 **Proveedor Moroso (Alerta Fiscal)** | Factura de *Distribuidora Central S.A.* (Cédula: `3-101-654321`) con Folio `MOR-7712` por ₡3.480 CRC. | La suma cuadra, pero al consultar el estado tributario del proveedor en `db.json`, figura como **MOROSO**. Se emite **alerta fiscal** y se retiene para aprobación. |
| **`5_proveedor_omiso_consultores.pdf`** | 📋 **Proveedor Omiso (Retención)** | Factura de *Consultores Técnicos Alfa Ltda.* (Cédula: `3-101-998877`) con Folio `OMI-5011` por ₡17.400 CRC. | La suma cuadra, pero el proveedor figura como **OMISO** en sus declaraciones tributarias. Se aplica **regla de retención** y requiere aprobación manual. |

---

## 🔍 Archivo de Consulta de Facturas (`consultar_facturas`)

- **`ejemplo_6_consultar_facturas.json`**:
  Contiene ejemplos de preguntas en lenguaje natural para verificar que el Agente IA en n8n active la herramienta **`consultar_facturas`** y responda con cifras reales de `db.json`:
  1. *¿Cuánto le debemos en total a Papelería López?*
  2. *¿Cuáles facturas requieren aprobación gerencial por monto mayor a 50000?*
  3. *¿Existen facturas asociadas a proveedores morosos u omisos?*
  4. *Listar todas las facturas en estado validada*

---

## 🚀 ¿Cómo Probar en la Aplicación Web?

1. Abre la aplicación en tu navegador: `http://localhost:5174/` (o el puerto activo de Vite).
2. Ve a la pestaña **Subir Comprobante**.
3. Arrastra cualquiera de los archivos `.pdf` de esta carpeta o haz clic para seleccionarlo.
4. El extractor OCR/PDF local leerá automáticamente el documento y rellenará los campos (**Proveedor, Cédula, Folio, Fecha, Subtotal, Impuestos y Total**).
5. Haz clic en **Procesar Factura con Agente IA**:
   - Si tienes el workflow de n8n en ejecución interactiva (`Test step`), verás iluminarse los nodos en vivo.
   - La factura se persistirá atómicamente en `backend-db/db.json`.
6. Ve a la pestaña **Facturas** para verla en la tabla interactiva, filtrar por estado o aprobarla/eliminarla.
7. Ve a la pestaña **Asistente Virtual** para hacerle preguntas como *¿Cuánto le debemos a Papelería López?* y verificar la consulta de facturas por IA.
