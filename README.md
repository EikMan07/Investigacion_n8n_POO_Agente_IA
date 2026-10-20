# Asistente Inteligente de Gestión de Facturas para PyMEs
### Arquitectura Orientada a Objetos (POO) en n8n, Persistencia Atómica en `db.json` y Front-End React

Este proyecto implementa una solución integral para la digitalización, validación contable determinista y orquestación inteligente de facturas para pequeñas y medianas empresas (PyMEs). Combina la flexibilidad de los agentes de inteligencia artificial (**ReAct**) con la rigurosidad matemática del código determinista y una arquitectura de software orientada a objetos (POO) sobre **n8n**, con persistencia local en **`db.json`** y sin dependencias externas de bases de datos en la nube.

---

## 1. ¿Qué problema resuelve?

Las PyMEs pierden un promedio de **12 a 18 horas semanales** en la captura manual de comprobantes fiscales, verificación aritmética de subtotales e impuestos, cruce contra estados de morosidad tributaria y programación de pagos. 

Los errores comunes en este proceso conllevan:
1. **Riesgo fiscal severo:** Deducir gastos de proveedores en estado *moroso* u *omiso* ante la administración tributaria.
2. **Pérdidas económicas:** Pagar facturas con cálculos de impuestos alterados o folios duplicados.
3. **Vulnerabilidades en automatizaciones con IA pura:** Dejar que un LLM calcule sumas numéricas o tome decisiones financieras sin supervisión de código ni aprobación humana.

### La Solución: Patrón Híbrido ReAct
> **"La IA propone, el código valida, y para montos altos un humano aprueba."**
- **La IA propone:** El Agente de n8n interpreta la intención en lenguaje natural o extrae los datos de facturas en PDF/imagen.
- **El código valida:** Sub-workflows modulares con nodos `Code` ejecutan validaciones matemáticas deterministas (`subtotal + impuestos == total`), comprueban duplicidad de folio y verifican la condición fiscal del proveedor.
- **El humano aprueba:** Toda factura con monto superior al umbral (`total > 50,000 CRC`) o con alerta fiscal es retenida para autorización manual antes de procesar el pago.

---

## 2. ¿Cómo se construyó? Mapeo de Conceptos POO en n8n

En lugar de construir flujos monolíticos y desordenados (*código espagueti*), el sistema modela los principios fundamentales de la Programación Orientada a Objetos:

| Concepto POO | Implementación en n8n | Rol en el Proyecto |
| :--- | :--- | :--- |
| **Clase** | Carpeta / Conjunto de Sub-workflows | `WF_Factura`, `WF_Proveedor`, `WF_Pago`, `WF_Notificador`. Cada clase agrupa los métodos de su dominio. |
| **Método** | Sub-workflow atómico individual | `WF_Factura_Crear`, `WF_Factura_Validar`, `WF_Factura_Guardar`, `WF_Pago_Programar`, etc. |
| **Objeto (Instancia)** | Payload JSON que viaja por el lienzo | Cada factura procesada posee su propia identidad (`F-2026-XXXX`), estado y atributos normalizados. |
| **Encapsulamiento** | Nodos `Code` y Trigger tipado | Los sub-workflows reciben entradas estructuradas mediante `Execute Workflow Trigger` y ocultan la lógica interna de validación. |
| **Abstracción** | Nodo `AI Agent (Tools Agent)` | El orquestador interactúa con las herramientas sin necesitar conocer cómo persiste internamente el archivo `db.json`. |
| **Herencia** | Estructura base común | Todos los objetos heredan campos base como `id`, `creado_en`, `actualizado_en` y trazabilidad. |
| **Polimorfismo** | Nodo `Switch` en `WF_Notificador_Notificar` | Un único método `notificar(canal, ...)` despacha dinámicamente según el canal: Email, Slack, Telegram o WhatsApp. |
| **Interfaz (Contrato)** | Formato universal de salida | Todo endpoint y sub-workflow responde obligatoriamente bajo el contrato `{ ok: boolean, data: object, error: string \| null }`. |

### Diagrama de Arquitectura

```mermaid
graph TD
    Client[Front-End React / Postman] -->|POST /webhook/facturas| Webhook[Webhook Trigger n8n]
    Webhook --> Normalizar[Set: Normalizar Entrada]
    Normalizar --> Agent[AI Agent - Tools Agent]
    
    subgraph Memoria & Modelo
        Agent --- Model[Chat Model GPT-4o / Claude]
        Agent --- Memory[Window Buffer Memory - 10 mensajes]
    end

    subgraph Sub-workflows POO (Herramientas)
        Agent --> Tool1[WF_Proveedor_Buscar]
        Agent --> Tool2[WF_Proveedor_Registrar]
        Agent --> Tool3[WF_Factura_Crear]
        Agent --> Tool4[WF_Factura_Validar]
        Agent --> Tool5[WF_Factura_Guardar]
        Agent --> Tool6[WF_Factura_Consultar]
        Agent --> Tool7[WF_Pago_Programar]
        Agent --> Tool8[WF_Notificador_Notificar]
    end

    subgraph Persistencia Atómica Local
        Tool1 & Tool2 & Tool3 & Tool4 & Tool5 & Tool6 & Tool7 & Tool8 --> API[Server Express :3001]
        API --> DB[(backend-db/db.json)]
    end

    Agent --> Parser[Structured Output Parser]
    Parser --> Validator[Code: Validar Salida Determinista]
    Validator --> IfApproval{¿Requiere Aprobación?}
    IfApproval -->|Total > 50K o Moroso| Hold[Respond: Retenida para Auditoría]
    IfApproval -->|Valida y Conforme| Direct[Respond: Registrada & Pago Agendado]
```

---

## 3. Estructura del Proyecto

```text
Investigacion_n8n_POO_Agente_IA/
├── backend-db/                     # Capa de datos y micro-servidor REST local
│   ├── package.json
│   ├── db.json                     # Base de datos JSON con datos semilla (PyME)
│   └── server.js                   # Servidor Express con lectura/escritura atómica
├── n8n-workflows/                  # Archivos importables y código de referencia para n8n
│   ├── workflow_principal.json     # Flujo orquestador con AI Agent y 8 tools
│   ├── subworkflows_clases.json    # Paquete de sub-workflows POO
│   ├── agent_config.md             # System Message, herramientas y JSON Schema
│   ├── nodos_code_referencia.js    # Código JavaScript de todos los nodos Code
│   └── subworkflows/               # JSONs individuales por cada método POO
│       ├── WF_Factura_Crear.json
│       ├── WF_Factura_Validar.json
│       ├── WF_Factura_Guardar.json
│       ├── WF_Factura_Consultar.json
│       ├── WF_Proveedor_Buscar.json
│       ├── WF_Proveedor_Registrar.json
│       ├── WF_Pago_Programar.json
│       └── WF_Notificador_Notificar.json
├── facturas-ia/                    # Aplicación Web en React 18 + Vite + Tailwind CSS
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── src/
│   │   ├── models/Factura.js       # Clase Factura con getters calculados
│   │   ├── api/n8nClient.js        # Cliente con soporte de Fallback inteligente
│   │   ├── components/             # UploadZone, FacturaCard, ChatAgente, KpiCards
│   │   ├── pages/                  # Dashboard, Subir, Chat, Aprobaciones
│   │   ├── App.jsx
│   │   └── index.css
├── docs/                           # Colecciones de pruebas y automatización
│   ├── postman_collection_facturas_n8n.json  # Colección Postman v2.1 (5 casos)
│   └── test_webhooks.sh            # Script de pruebas en cURL
└── README.md                       # Documentación principal del repositorio
```

---

## 4. Guía de Inicio Rápido Paso a Paso

### Prerrequisitos
- Node.js versión 18 o superior.
- n8n (instalado globalmente vía `npx n8n` o ejecutándose en `http://localhost:5678`).

---

### Paso 1: Levantar la Persistencia Local (`db.json`)
Abre una terminal en `Investigacion_n8n_POO_Agente_IA/backend-db`:
```bash
cd backend-db
npm install
npm start
```
El servidor quedará activo en `http://localhost:3001` con persistencia atómica en `backend-db/db.json`.

---

### Paso 2: Importar Workflows en n8n
1. Inicia tu instancia local de n8n:
   ```bash
   npx n8n
   ```
2. En la interfaz web de n8n (`http://localhost:5678`), ve a **Workflows** -> **Import from File**.
3. Importa los sub-workflows desde la carpeta `n8n-workflows/subworkflows/`.
4. Importa el flujo principal desde `n8n-workflows/workflow_principal.json`.
5. Activa los workflows haciendo clic en **Active**.

> **Nota:** La configuración completa del `System Message`, credenciales del modelo y el esquema JSON para el `Structured Output Parser` se encuentra documentada en [agent_config.md](file:///c:/Users/abark/OneDrive/Documentos/OneDrive/Escritorio/n8n/Investigacion_n8n_POO_Agente_IA/n8n-workflows/agent_config.md).

---

### Paso 3: Levantar la Aplicación Web (`facturas-ia`)
Abre otra terminal en `Investigacion_n8n_POO_Agente_IA/facturas-ia`:
```bash
cd facturas-ia
npm install
npm run dev
```
Abre en tu navegador `http://localhost:5173`. 
> La aplicación cuenta con un **Fallback Inteligente**: si tu n8n no está corriendo, interactuará directamente contra `http://localhost:3001/api` simulando las respuestas del agente, permitiéndote probar la interfaz al 100%.

---

### Paso 4: Ejecutar la Batería de Pruebas
Puedes probar los endpoints tanto desde **Postman** importando `docs/postman_collection_facturas_n8n.json`, como mediante el script de pruebas automatizado:
```bash
cd docs
bash test_webhooks.sh
```

---

## 5. ¿Qué aprendí? y Uso Transparente de la IA

1. **Los LLMs son probabilísticos, la contabilidad es determinista:**
   Un modelo de lenguaje nunca debe sumar subtotales o impuestos en producción. La arquitectura delega el razonamiento orquestador a la IA y la verificación matemática a nodos de código en TypeScript/JavaScript (`Number((subtotal + impuestos).toFixed(2)) === total`).
2. **Modularidad mediante POO:**
   Dividir las responsabilidades en métodos (`WF_Factura_Validar`, `WF_Pago_Programar`) permite reutilizar flujos en otros procesos de la empresa sin duplicar lógica.
3. **Persistencia Ligera y Confiable:**
   El uso de `db.json` con escrituras atómicas (archivos temporales y reemplazo seguro) permite una portabilidad total sin depender de configurar instancias pesadas de base de datos en pruebas o demostraciones.
4. **Seguridad contra Prompt Injection:**
   Al tratar todo texto extraído de documentos como datos pasivos y forzar la salida mediante un esquema estricto de `Structured Output Parser`, se anula el riesgo de que una factura maliciosa ordene pagos no autorizados.
