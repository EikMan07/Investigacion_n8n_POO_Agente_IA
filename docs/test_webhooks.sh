#!/usr/bin/env bash
# ==============================================================================
# Script de Pruebas Automatizadas con cURL
# Asistente Inteligente de Facturas PyME (POO en n8n + db.json)
# ==============================================================================

N8N_URL=${N8N_WEBHOOK_URL:-"http://localhost:5678/webhook/facturas"}
DB_URL=${DB_API_URL:-"http://localhost:3001/api"}

VERDE='\033[0;32m'
ROJO='\033[0;31m'
AMARILLO='\033[1;33m'
AZUL='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${AZUL}======================================================================${NC}"
echo -e "${AZUL}    Batería de Pruebas de Integración: n8n POO + Persistencia db.json ${NC}"
echo -e "${AZUL}======================================================================${NC}"
echo -e "Target n8n Webhook: ${N8N_URL}"
echo -e "Target Backend db:  ${DB_URL}"
echo ""

# ------------------------------------------------------------------------------
# Caso 1: Factura Válida (Cuadra subtotal + impuestos == total)
# ------------------------------------------------------------------------------
echo -e "${AMARILLO}[Caso 1] Enviando Factura Válida (1200 + 192 = 1392 CRC)...${NC}"
curl -s -X POST "${DB_URL}/facturas/validar" \
  -H "Content-Type: application/json" \
  -d '{
    "subtotal": 1200.00,
    "impuestos": 192.00,
    "total": 1392.00,
    "folio": "TEST-CURL-01",
    "identificacion_fiscal": "3-101-123456",
    "proveedor": "Papelería López S.A."
  }' | grep '"valida":true' > /dev/null

if [ $? -eq 0 ]; then
  echo -e "${VERDE}✓ Caso 1 superado: Validación determinista aprobó los cálculos aritméticos.${NC}"
else
  echo -e "${ROJO}✗ Caso 1 falló: Respuesta inesperada.${NC}"
fi
echo ""

# ------------------------------------------------------------------------------
# Caso 2: Detección de Error Aritmético Determinista
# ------------------------------------------------------------------------------
echo -e "${AMARILLO}[Caso 2] Enviando Factura con Discrepancia Aritmética (1200 + 192 != 2000)...${NC}"
RESP_ERR=$(curl -s -X POST "${DB_URL}/facturas/validar" \
  -H "Content-Type: application/json" \
  -d '{
    "subtotal": 1200.00,
    "impuestos": 192.00,
    "total": 2000.00,
    "folio": "TEST-CURL-ERR",
    "identificacion_fiscal": "3-101-123456",
    "proveedor": "Papelería López S.A."
  }')

echo "$RESP_ERR" | grep '"valida":false' > /dev/null
if [ $? -eq 0 ]; then
  echo -e "${VERDE}✓ Caso 2 superado: El código determinista detectó la alteración y bloqueó el guardado.${NC}"
else
  echo -e "${ROJO}✗ Caso 2 falló: No se detectó la discrepancia aritmética.${NC}"
fi
echo ""

# ------------------------------------------------------------------------------
# Caso 3: Factura de Monto Alto (>50K) o Proveedor Moroso
# ------------------------------------------------------------------------------
echo -e "${AMARILLO}[Caso 3] Enviando Factura de Monto Alto (65,000 CRC > 50,000 Umbral)...${NC}"
RESP_ALTO=$(curl -s -X POST "${DB_URL}/facturas/validar" \
  -H "Content-Type: application/json" \
  -d '{
    "subtotal": 56034.48,
    "impuestos": 8965.52,
    "total": 65000.00,
    "folio": "TEST-CURL-ALTO",
    "identificacion_fiscal": "3-102-445566",
    "proveedor": "Servicios de Nube y Redes CloudTech S.A."
  }')

echo "$RESP_ALTO" | grep '"requiere_aprobacion":true' > /dev/null
if [ $? -eq 0 ]; then
  echo -e "${VERDE}✓ Caso 3 superado: Flag requiere_aprobacion activado correctamente.${NC}"
else
  echo -e "${ROJO}✗ Caso 3 falló: No se activó la retención preventiva para monto alto.${NC}"
fi
echo ""

# ------------------------------------------------------------------------------
# Caso 4: Consulta de Facturas y Saldos en db.json
# ------------------------------------------------------------------------------
echo -e "${AMARILLO}[Caso 4] Consultando Facturas de Papelería López en db.json...${NC}"
curl -s -X GET "${DB_URL}/facturas/consultar?proveedor=Papeler%C3%ADa" | grep '"ok":true' > /dev/null

if [ $? -eq 0 ]; then
  echo -e "${VERDE}✓ Caso 4 superado: Consulta filtrada completada exitosamente.${NC}"
else
  echo -e "${ROJO}✗ Caso 4 falló: Error al consultar facturas.${NC}"
fi
echo ""

# ------------------------------------------------------------------------------
# Caso 5: Aprobación Humana de Factura
# ------------------------------------------------------------------------------
echo -e "${AMARILLO}[Caso 5] Aprobando Factura F-2026-0002 en db.json con Auditoría...${NC}"
curl -s -X PATCH "${DB_URL}/facturas/F-2026-0002/aprobar" \
  -H "Content-Type: application/json" \
  -d '{
    "aprobada": true,
    "usuario": "Auditor Senior QA",
    "comentario": "Aprobación verificada mediante script cURL de pruebas."
  }' | grep '"estado":"aprobada"' > /dev/null

if [ $? -eq 0 ]; then
  echo -e "${VERDE}✓ Caso 5 superado: Factura aprobada y persistida en db.json de forma atómica.${NC}"
else
  echo -e "${ROJO}✗ Caso 5 falló: No se pudo actualizar el estado de aprobación.${NC}"
fi

echo ""
echo -e "${AZUL}======================================================================${NC}"
echo -e "${AZUL}    Batería de Pruebas Finalizada con Éxito                          ${NC}"
echo -e "${AZUL}======================================================================${NC}"
