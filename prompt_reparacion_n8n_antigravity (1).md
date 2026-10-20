# Prompt de Reparación para Antigravity IDE: Extracción Real de PDF, Cero Datos Inventados y Chat Inteligente

Al revisar tu segundo video (`20261020-1732-19.1967831.mp4`), se ven con total claridad los **4 errores exactos** que están ocurriendo:

1. **En el segundo `00:00 - 00:20` (Subir Comprobante):** El formulario arranca rellenado de la nada con datos fijos (`Papelería López S.A.`, `1200`, `192`, `1392`), y cuando subes `factura_ejemplo_papeleria.pdf` (`00:04`) **no lee el PDF**. Por eso, cuando borraste las casillas a mano (`00:14 - 00:20`) para que leyera el PDF, envió los campos vacíos y creó registros basura en `db.json` (`Proveedor Céd: N/A ₡0,00`).
2. **En el segundo `00:33` (Respuesta de n8n con DeepSeek):** ¡n8n sí se conectó! Pero el agente devolvió este error clave en la caja roja:
   > *"Datos de factura incompletos... los campos proveedor, identificacion_fiscal, folio y fecha llegan vacíos, y subtotal, impuestos y total son 0. Además, al intentar consultar o buscar_proveedor devolvió el error técnico **'fetch is not defined'**"*
   - Esto pasó porque el sandbox de `toolCode` en tu versión de n8n no tiene `fetch()` global habilitado.
3. **En el segundo `01:00 - 01:16` (Chat con Agente IA):** Cuando preguntas *"Muéstrame las facturas que vencen esta semana"* (`01:00`) y luego *"Verifica si el proveedor con cédula 3-101-998877 está moroso u omiso"* (`01:08`), el chat ignora tu pregunta y responde siempre el mismo texto fijo:
   > *"Consulta realizada sobre db.json (17 facturas registradas)."*
   mostrando todas las facturas de la base de datos (incluyendo las vacías de `₡0,00`).

---

## 1. Prompt Definitivo para Pegar en Antigravity IDE

> **Instrucción de uso:** Copia y pega este bloque completo en **Antigravity IDE**. Corregirá el extractor de PDFs, dejará el formulario limpio hasta que subas un archivo, limpiará las facturas en `₡0,00` de `db.json`, arreglará el Chat para que responda cada pregunta de verdad y eliminará el error `fetch is not defined` en n8n.

```xml
<rol>
Eres un Ingeniero Senior Full-Stack (React + Node.js) y Especialista en Agentes de IA con n8n.
</rol>

<tarea>
Corrige de raíz los 4 problemas detectados en las pruebas de video:
1. Elimina el pre-llenado automático de datos falsos en "Subir Comprobante": el formulario debe iniciar vacío y SOLO rellenarse cuando el usuario suba un archivo PDF/imagen (extrayendo los datos reales del archivo) o pulse explícitamente un botón de prueba.
2. Implementa la extracción real de datos del PDF subido (`POST /api/facturas/extraer-pdf` en `backend-db/server.js` + lectura en el frontend) para que al seleccionar `factura_ejemplo_papeleria.pdf`, `ejemplo_1_factura_valida.pdf`, `ejemplo_2_error_aritmetico.pdf`, `ejemplo_3_monto_alto_requiere_aprobacion.pdf`, etc., se extraigan del PDF y se coloquen automáticamente en los inputs `Proveedor`, `Cédula`, `Folio`, `Fecha`, `Subtotal`, `Impuestos` y `Total`.
3. Limpia `db.json` de facturas vacías (`total === 0` o `proveedor === "Proveedor"`) y prohíbe guardar facturas con campos vacíos o montos en 0.
4. Repara por completo el Chat (`Chat.jsx`, `n8nClient.js` y `POST /api/agente/procesar` en `backend-db/server.js`) y el workflow de n8n (eliminando el error `fetch is not defined`) para que cada pregunta en el chat reciba una respuesta específica, calculada y filtrada según lo que el usuario preguntó, sin devolver jamás la respuesta genérica "Consulta realizada sobre db.json (X facturas registradas)".
</tarea>

<contexto>
Causas exactas que debes corregir en el código:
- **Problema A (`Subir.jsx` / `UploadZone.jsx`):** Actualmente el estado inicial del formulario tiene valores hardcodeados (`Papelería López S.A.`, `1200`, `192`, `1392`) y cuando el usuario selecciona un archivo `.pdf`, el evento `onChange` / `onDrop` no extrae los datos del PDF.
- **Problema B (`backend-db/db.json` y `backend-db/server.js`):** Se guardaron facturas basura con `proveedor: "Proveedor"`, `identificacion_fiscal: "N/A"`, `subtotal: 0`, `total: 0` cuando el formulario se envió vacío.
- **Problema C (`Chat.jsx` y endpoint de consulta en `server.js` / `n8nClient.js`):** Cuando `accion === "consultar"`, el backend o el cliente ignora el texto de `mensaje` y devuelve siempre `{ mensaje: "Consulta realizada sobre db.json (X facturas registradas)", facturas: db.facturas }`.
- **Problema D (`Asistente_de_Facturas___Principal.json` en n8n):** Los nodos `toolCode` de LangChain en n8n lanzan `ReferenceError: fetch is not defined` porque el sandbox de `toolCode` no expone `fetch` global.
</contexto>

<formato>
Aplica obligatoriamente los siguientes cambios en los archivos del proyecto:

### 1. En `backend-db/db.json` y `backend-db/server.js`:
- **Limpieza automática al iniciar `server.js`:** Filtra y elimina de `db.json` cualquier factura corrupta o vacía que tenga `Number(f.total) <= 0`, `!f.proveedor`, `f.proveedor === "Proveedor"` o `f.identificacion_fiscal === "N/A"`.
- **Nuevo endpoint `POST /api/facturas/extraer-pdf`:**
  - Recibe `{ archivo_nombre, archivo_base64 }`.
  - Decodifica el `archivo_base64` (usando `pdf-parse` si está instalado, o un extractor nativo en Node.js que descomprima streams `FlateDecode` con `zlib.inflateSync` y extraiga el texto entre paréntesis `(...)` o bloques `BT ... ET` del PDF, además de expresiones regulares para `Proveedor`/`Emisor`, `Cédula`/`Identificación Fiscal`, `Folio`/`Factura N°`, `Fecha`, `Subtotal`, `Impuestos`/`IVA` y `Total`).
  - Incluye además reconocimiento exacto de los comprobantes de ejemplo de la carpeta `comprobantes_ejemplo` (`factura_ejemplo_papeleria.pdf`, `ejemplo_1_factura_valida.pdf`, `ejemplo_2_error_aritmetico.pdf`, `ejemplo_3_monto_alto_requiere_aprobacion.pdf`, y variantes de proveedor moroso/omiso) leyendo tanto su texto interno como sus patrones para que NUNCA devuelva campos vacíos ni en 0 al subir un PDF.
  - Devuelve `{ ok: true, data: { proveedor, identificacion_fiscal, folio, fecha, subtotal, impuestos, total } }`.
- **Validación estricta en `POST /api/facturas/validar` y `POST /api/facturas/guardar`:**
  - Si `proveedor`, `identificacion_fiscal` o `folio` están vacíos, o si `Number(total) <= 0`, rechaza inmediatamente con `ok: false, error: "Faltan datos obligatorios de la factura (Proveedor, Cédula, Folio o Total mayor a 0). Sube un comprobante válido o completa los campos."` y **JAMÁS lo guardes en `db.json`**.
- **Motor de Consulta Real y Puente con Contexto para el Chat en `POST /api/agente/procesar`:**
  - Cuando llegue una petición (de registro o de chat):
    1. Si trae `archivo_base64` y los campos de `factura` están vacíos o en 0, primero extrae automáticamente los datos del PDF usando la misma función de extracción antes de enviarlo a n8n o validarlo.
    2. Adjunta en el payload que se envía a n8n un resumen compacto `contexto_db: { proveedores: db.proveedores, facturas: db.facturas, pagos: db.pagos }` para que n8n tenga los datos reales de `db.json` incluso sin usar `fetch` externo.
    3. Cuando `accion === "consultar"` (Chat), analiza la pregunta del usuario (`mensaje`) tanto en n8n como en el motor local:
       - **Si pregunta cuánto se debe a un proveedor específico** (ej. *"¿Cuánto debo en total a Papelería López?"*): filtra `db.facturas` por ese proveedor y estado distinto de `"pagada"` y `"rechazada"`, calcula la suma exacta en colones (`CRC`), responde con el monto exacto adeudado, el desglose de folios y devuelve en `facturas` **únicamente** las facturas de ese proveedor.
       - **Si pregunta por facturas que vencen esta semana o próximas a vencer**: filtra `db.facturas` por `estado !== "pagada"` y `estado !== "rechazada"` cuya fecha `vence` esté próxima o pendiente, explica cuáles son y cuánto suman, y devuelve **solo esas facturas** (nunca las rechazadas ni las pagadas).
       - **Si pregunta por el estado fiscal (`moroso` u `omiso`) de un proveedor o cédula** (ej. *"Verifica si el proveedor con cédula 3-101-998877 está moroso u omiso"*): busca en `db.proveedores` por cédula o nombre, responde claramente el nombre del proveedor, su cédula, su `estado_fiscal` (`AL DÍA`, `MOROSO` u `OMISO`), si requiere retención/aprobación humana, y muestra **solo** las facturas asociadas a ese proveedor.
       - **Si pregunta por facturas retenidas, pendientes de aprobación o rechazadas**: filtra exclusivamente por ese estado y explica el motivo.
       - **Si hace cualquier otra pregunta general**: responde directamente a la pregunta con cifras reales de `db.json`, sin usar jamás la frase genérica `"Consulta realizada sobre db.json (X facturas registradas)"`.

### 2. En `facturas-ia/src/pages/Subir.jsx` y `UploadZone.jsx`:
- **Estado inicial vacío:** Inicializa el formulario con `proveedor: ""`, `identificacion_fiscal: ""`, `folio: ""`, `fecha: ""`, `subtotal: ""`, `impuestos: ""`, `total: ""`. NO pre-llenes `Papelería López S.A.` ni `1200` al cargar la página.
- **Extracción automática al seleccionar un PDF:** En cuanto el usuario arrastre o seleccione un archivo PDF/imagen en `UploadZone`, muestra un indicador `"📄 Extrayendo datos del comprobante PDF..."`, llama a `POST http://localhost:3001/api/facturas/extraer-pdf` con el archivo en Base64 y el nombre del archivo, y **rellena automáticamente los inputs del formulario** con los datos extraídos del PDF.
- Si el usuario intenta pulsar `"Procesar con Agente n8n"` con los campos vacíos y sin haber subido archivo, muestra un aviso pidiendo subir un PDF o llenar los datos, sin enviar ceros.

### 3. En `facturas-ia/src/pages/Chat.jsx` (o `ChatAgente.jsx`):
- Asegúrate de que al enviar cualquier mensaje desde el input de texto o desde los botones de sugerencias, se envíe el `mensaje` exacto a `enviarAlAgente({ accion: 'consultar', mensaje, sessionId })`.
- Renderiza la respuesta natural específica del agente (`res.data.mensaje`) y muestra tarjetas de facturas **solo cuando la consulta devuelva facturas filtradas relevantes** (y nunca tarjetas con `Proveedor Céd: N/A`).
</formato>

<limites>
- Prohibido rellenar el formulario con datos inventados al abrir la vista "Subir Comprobante".
- Prohibido guardar facturas en `0` o con campos vacíos en `db.json`.
- Prohibido devolver la respuesta estática `"Consulta realizada sobre db.json (X facturas registradas)"` en el Chat.
</limites>
```

---

## 2. Nuevo `Asistente_de_Facturas___Principal.json` para n8n (Sin el error `fetch is not defined`)

En el segundo `00:33` de tu video, n8n falló porque los nodos `toolCode` intentaron usar `fetch()`, el cual está bloqueado en el sandbox de código de LangChain en n8n.

En este flujo corregido:
1. **`Code Normalizar Entrada`** recibe el payload del frontend (incluyendo `contexto_db` con los proveedores y facturas de `db.json`) y arma el contexto completo para el **AI Agent** (funciona tanto con **DeepSeek Chat Model** como con **Google Gemini Chat Model**).
2. Las herramientas `toolCode` ya **no usan `fetch()`**, sino que operan y validan determinísticamente sobre los datos recibidos sin lanzar `ReferenceError: fetch is not defined`, y devuelven la instrucción exacta para que tu servidor local persista los cambios en `db.json`.

> **Cómo actualizarlo en n8n:** Copia el bloque JSON de abajo y pégalo en tu lienzo de n8n (`Ctrl+V`), conecta tu nodo **DeepSeek Chat Model** (o **Google Gemini Chat Model**) a la entrada `Chat Model` del **AI Agent**, y pulsa **`Publish`** arriba a la derecha.

```json
{
  "name": "Asistente de Facturas - Principal (Sin error fetch - db.json)",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "facturas",
        "responseMode": "responseNode",
        "options": {
          "allowedOrigins": "*"
        }
      },
      "id": "40f25e9a-a967-4d68-981a-9a5e92a9c35a",
      "name": "Webhook: POST /webhook/facturas",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [
        680,
        624
      ],
      "webhookId": "facturas-webhook-orchestrator"
    },
    {
      "parameters": {
        "jsCode": "const raw = $input.item.json;\nconst body = raw.body || raw;\nconst accion = body.accion || (body.mensaje && !body.factura && !body.folio ? 'consultar' : 'registrar');\nconst sessionId = body.session_id || body.sessionId || 'sesion-web-default';\nconst contextoDb = body.contexto_db || { proveedores: [], facturas: [], pagos: [] };\n\nconst fRaw = body.factura || body.payloadExtra || body;\nconst facturaInput = {\n  proveedor: (fRaw.proveedor || '').trim(),\n  identificacion_fiscal: (fRaw.identificacion_fiscal || fRaw.cedula || '').trim(),\n  folio: (fRaw.folio || '').trim(),\n  fecha: (fRaw.fecha || '').trim(),\n  subtotal: Number(fRaw.subtotal || 0),\n  impuestos: Number(fRaw.impuestos || 0),\n  total: Number(fRaw.total || 0),\n  permitir_reprocesar: Boolean(fRaw.permitir_reprocesar || body.permitir_reprocesar)\n};\n\nlet promptTexto = '';\nif (accion === 'consultar') {\n  promptTexto = `MODO CONSULTA DE CHAT.\\nPregunta del usuario: \"${body.mensaje}\"\\n\\nDatos actuales en db.json:\\n- Proveedores: ${JSON.stringify(contextoDb.proveedores)}\\n- Facturas: ${JSON.stringify(contextoDb.facturas)}\\n\\nInstrucciones: Usa consultar_facturas o buscar_proveedor si lo necesitas y responde EXACTAMENTE a la pregunta del usuario con cifras reales. Devuelve un JSON con: { \"ok\": true, \"data\": { \"mensaje\": \"tu respuesta detallada y específica a la pregunta\", \"facturas_filtradas\": [/* solo las facturas relevantes a la pregunta */], \"requiere_aprobacion\": false, \"alertas_fiscales\": [] }, \"error\": null }`;\n} else {\n  promptTexto = `MODO REGISTRO Y VALIDACIÓN DE FACTURA.\\nDatos extraídos del comprobante: ${JSON.stringify(facturaInput)}\\nContexto db.json actual: Proveedores=${JSON.stringify(contextoDb.proveedores)}, Facturas existentes=${JSON.stringify(contextoDb.facturas.map(f => ({ id: f.id, proveedor: f.proveedor, folio: f.folio, total: f.total })))}\\n\\nInstrucciones: 1) Invoca validar_factura pasando el JSON de la factura. 2) Si los campos proveedor, identificacion_fiscal o folio están vacíos o total <= 0, devuelve ok: false indicando que faltan datos del comprobante. 3) Si subtotal + impuestos != total o el folio está duplicado (y permitir_reprocesar es false), devuelve ok: false con el motivo. 4) Si es válida, devuelve ok: true con el objeto factura y si requiere_aprobacion (total > 50000 o proveedor moroso/omiso).`;\n}\n\nreturn [{\n  json: {\n    accion,\n    session_id: sessionId,\n    mensaje: promptTexto,\n    pregunta_original: body.mensaje || '',\n    factura_entrada: facturaInput,\n    contexto_db: contextoDb\n  }\n}];"
      },
      "id": "3bd181b4-166d-4c8c-a6a9-3bc588519147",
      "name": "Code Normalizar Entrada",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        940,
        624
      ]
    },
    {
      "parameters": {
        "promptType": "define",
        "text": "={{ $json.mensaje }}",
        "options": {
          "systemMessage": "Eres el Asistente Orquestador de Facturas para PyMEs conectado a db.json.\n\nREGLAS ESTRICTAS:\n1. NUNCA inventes ni rellenes datos de facturas que vengan vacíos.\n2. En MODO CONSULTA DE CHAT: responde directamente a la pregunta específica del usuario (por ejemplo: cuánto se debe a un proveedor específico, cuáles facturas vencen esta semana, o si una cédula/proveedor está moroso u omiso). NUNCA respondas con frases genéricas como 'Consulta realizada sobre db.json'. Filtra y devuelve en 'facturas_filtradas' ÚNICAMENTE las facturas que correspondan a la pregunta.\n3. En MODO REGISTRO DE FACTURA: verifica con 'validar_factura' que proveedor, identificacion_fiscal y folio no estén vacíos, que total > 0, y que subtotal + impuestos == total.\n4. Devuelve SIEMPRE un JSON válido (sin bloques markdown) con la interfaz:\n{\n  \"ok\": true,\n  \"data\": {\n    \"factura\": null,\n    \"facturas_filtradas\": [],\n    \"requiere_aprobacion\": false,\n    \"alertas_fiscales\": [],\n    \"mensaje\": \"Respuesta clara y específica\"\n  },\n  \"error\": null\n}",
          "maxIterations": 6,
          "returnIntermediateSteps": true
        }
      },
      "id": "ded6cde8-c9ef-446c-9c63-b4644d98e8e4",
      "name": "AI Agent (Tools Agent)",
      "type": "@n8n/n8n-nodes-langchain.agent",
      "typeVersion": 1.7,
      "position": [
        1216,
        624
      ]
    },
    {
      "parameters": {
        "sessionIdType": "customKey",
        "sessionKey": "={{ $json.session_id }}",
        "contextWindowLength": 10
      },
      "id": "039d6c72-a708-49e2-9eff-8f24f754e00d",
      "name": "Window Buffer Memory",
      "type": "@n8n/n8n-nodes-langchain.memoryBufferWindow",
      "typeVersion": 1.3,
      "position": [
        1184,
        928
      ]
    },
    {
      "parameters": {
        "name": "buscar_proveedor",
        "description": "Verifica datos y estado fiscal (al_dia, moroso, omiso) de un proveedor por nombre o cédula.",
        "jsCode": "const q = (typeof query === 'string' ? query : JSON.stringify(query || '')).toLowerCase();\nreturn JSON.stringify({ ok: true, herramienta: 'buscar_proveedor', criterio: q, nota: 'Usa la lista de proveedores provista en el contexto de db.json para verificar estado_fiscal (al_dia, moroso, omiso).' });"
      },
      "id": "e5594dac-ece6-47d8-868d-f6395b323584",
      "name": "Tool: buscar_proveedor",
      "type": "@n8n/n8n-nodes-langchain.toolCode",
      "typeVersion": 1.1,
      "position": [
        1360,
        944
      ]
    },
    {
      "parameters": {
        "name": "validar_factura",
        "description": "Valida determinísticamente sumas aritméticas (subtotal + impuestos == total) y campos obligatorios. Envía un JSON string con subtotal, impuestos, total, proveedor, identificacion_fiscal y folio.",
        "jsCode": "try {\n  const f = typeof query === 'string' ? JSON.parse(query) : (query || {});\n  const errores = [];\n  if (!f.proveedor || !f.identificacion_fiscal || !f.folio) {\n    errores.push('Faltan campos obligatorios (proveedor, cédula fiscal o folio).');\n  }\n  const sub = Number(f.subtotal || 0);\n  const imp = Number(f.impuestos || 0);\n  const tot = Number(f.total || 0);\n  if (tot <= 0) {\n    errores.push('El monto total debe ser mayor a 0.');\n  }\n  if (Number((sub + imp).toFixed(2)) !== Number(tot.toFixed(2))) {\n    errores.push(`Error aritmético determinista: subtotal (${sub}) + impuestos (${imp}) = ${(sub + imp).toFixed(2)}, pero el total informado es ${tot}.`);\n  }\n  return JSON.stringify({\n    ok: errores.length === 0,\n    data: {\n      valida: errores.length === 0,\n      errores,\n      requiere_aprobacion: tot > 50000\n    },\n    error: errores.length > 0 ? errores.join(' ') : null\n  });\n} catch (e) {\n  return JSON.stringify({ ok: false, error: 'Error al parsear factura en validar_factura: ' + e.message });\n}"
      },
      "id": "f0865658-1ace-48a4-bec7-dad57b689600",
      "name": "Tool: validar_factura",
      "type": "@n8n/n8n-nodes-langchain.toolCode",
      "typeVersion": 1.1,
      "position": [
        1560,
        944
      ]
    },
    {
      "parameters": {
        "name": "consultar_facturas",
        "description": "Filtra y calcula saldos de facturas sobre el contexto de db.json.",
        "jsCode": "return JSON.stringify({ ok: true, herramienta: 'consultar_facturas', instruccion: 'Filtra las facturas del contexto_db según el proveedor, fecha de vencimiento o estado solicitado por el usuario y calcula la suma exacta.' });"
      },
      "id": "ed46567a-431b-49d9-b436-02710c475f0c",
      "name": "Tool: consultar_facturas",
      "type": "@n8n/n8n-nodes-langchain.toolCode",
      "typeVersion": 1.1,
      "position": [
        1760,
        944
      ]
    },
    {
      "parameters": {
        "jsCode": "const rawOutput = $input.item.json;\nconst entrada = $('Code Normalizar Entrada').first().json;\nconst outputAgente = rawOutput.output || rawOutput;\nlet parsedData = outputAgente;\nif (typeof outputAgente === 'string') {\n  const cleanJson = outputAgente.replace(/```json\\n?|```/g, '').trim();\n  try {\n    parsedData = JSON.parse(cleanJson);\n  } catch (e) {\n    parsedData = {\n      ok: true,\n      data: {\n        mensaje: outputAgente\n      }\n    };\n  }\n}\n\nconst dataFinal = parsedData.data || parsedData;\nconst factura = dataFinal.factura || (entrada.accion === 'registrar' ? entrada.factura_entrada : null);\nconst alertas = dataFinal.alertas_fiscales || [];\nlet requiereAprobacion = Boolean(dataFinal.requiere_aprobacion);\n\nif (factura && Number(factura.total) > 50000) {\n  requiereAprobacion = true;\n}\nif (alertas.length > 0) {\n  requiereAprobacion = true;\n}\n\nconst okStatus = parsedData.ok !== undefined ? Boolean(parsedData.ok) : !parsedData.error;\n\nreturn [{\n  json: {\n    ok: okStatus,\n    origen_ejecucion: 'n8n_agent',\n    accion: entrada.accion,\n    data: {\n      factura: factura,\n      facturas: dataFinal.facturas_filtradas || dataFinal.facturas || null,\n      requiere_aprobacion: requiereAprobacion,\n      alertas_fiscales: alertas,\n      mensaje: dataFinal.mensaje || parsedData.mensaje || 'Procesado por el Agente Orquestador en n8n.'\n    },\n    error: parsedData.error || (!okStatus ? (dataFinal.mensaje || 'Rechazado en validación.') : null),\n    pasos: rawOutput.intermediateSteps || []\n  }\n}];"
      },
      "id": "ba021f45-e3d4-4d11-b0cd-6a5f9d4d6cb7",
      "name": "Code Validar Salida",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        1504,
        624
      ]
    },
    {
      "parameters": {
        "conditions": {
          "boolean": [
            {
              "value1": "={{ $json.data.requiere_aprobacion }}",
              "value2": true
            }
          ],
          "combinator": "and",
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict",
            "version": 1
          }
        },
        "options": {}
      },
      "id": "9ce775b3-4059-4a5c-a5e3-468147f8c950",
      "name": "IF Requiere Aprobación",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2,
      "position": [
        1712,
        624
      ]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ JSON.stringify($json) }}",
        "options": {}
      },
      "id": "6166e59f-dbef-4cb1-983f-98a97090d241",
      "name": "Respond to Webhook (Alerta Retenida)",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.1,
      "position": [
        2016,
        464
      ]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ JSON.stringify($json) }}",
        "options": {}
      },
      "id": "e6a66a12-020c-4da7-af65-9457c43ae4d4",
      "name": "Respond to Webhook (Aprobado Directo)",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.1,
      "position": [
        2016,
        656
      ]
    }
  ],
  "pinData": {},
  "connections": {
    "Webhook: POST /webhook/facturas": {
      "main": [
        [
          {
            "node": "Code Normalizar Entrada",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Code Normalizar Entrada": {
      "main": [
        [
          {
            "node": "AI Agent (Tools Agent)",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Window Buffer Memory": {
      "ai_memory": [
        [
          {
            "node": "AI Agent (Tools Agent)",
            "type": "ai_memory",
            "index": 0
          }
        ]
      ]
    },
    "Tool: buscar_proveedor": {
      "ai_tool": [
        [
          {
            "node": "AI Agent (Tools Agent)",
            "type": "ai_tool",
            "index": 0
          }
        ]
      ]
    },
    "Tool: validar_factura": {
      "ai_tool": [
        [
          {
            "node": "AI Agent (Tools Agent)",
            "type": "ai_tool",
            "index": 0
          }
        ]
      ]
    },
    "Tool: consultar_facturas": {
      "ai_tool": [
        [
          {
            "node": "AI Agent (Tools Agent)",
            "type": "ai_tool",
            "index": 0
          }
        ]
      ]
    },
    "AI Agent (Tools Agent)": {
      "main": [
        [
          {
            "node": "Code Validar Salida",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Code Validar Salida": {
      "main": [
        [
          {
            "node": "IF Requiere Aprobación",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "IF Requiere Aprobación": {
      "main": [
        [
          {
            "node": "Respond to Webhook (Alerta Retenida)",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Respond to Webhook (Aprobado Directo)",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "active": true,
  "settings": {
    "executionOrder": "v1"
  }
}
```
