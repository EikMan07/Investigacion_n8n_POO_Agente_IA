/**
 * Clase Factura (Frontend Mirror de la entidad de negocio en n8n y db.json)
 * Mapeo POO con encapsulamiento, getters computados y formato regional.
 */
export class Factura {
  constructor(data = {}) {
    this.id = data.id || `F-${Date.now()}`;
    this.proveedor = data.proveedor || 'Proveedor No Identificado';
    this.proveedor_id = data.proveedor_id || null;
    this.identificacion_fiscal = data.identificacion_fiscal || 'N/A';
    this.folio = data.folio || 'S/F';
    this.fecha = data.fecha || new Date().toISOString().split('T')[0];
    this.subtotal = Number(data.subtotal) || 0;
    this.impuestos = Number(data.impuestos) || 0;
    this.total = Number(data.total) || Number((this.subtotal + this.impuestos).toFixed(2));
    this.moneda = data.moneda || 'CRC';
    this.estado = data.estado || 'pendiente';
    this.vence = data.vence || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    this.requiere_aprobacion = Boolean(data.requiere_aprobacion);
    this.aprobada_por = data.aprobada_por || null;
    this.comentario_aprobacion = data.comentario_aprobacion || null;
    this.archivo_nombre = data.archivo_nombre || null;
    this.alertas_fiscales = Array.isArray(data.alertas_fiscales) ? data.alertas_fiscales : [];
    this.creado_en = data.creado_en || new Date().toISOString();
  }

  /**
   * Indica si la factura ya superó la fecha límite y sigue pendiente de pago.
   */
  get estaVencida() {
    if (this.estado === 'pagada' || this.estado === 'rechazada') {
      return false;
    }
    const fechaVencimiento = new Date(this.vence);
    const hoy = new Date();
    // Comparar únicamente fechas ignorando la hora
    hoy.setHours(0, 0, 0, 0);
    return fechaVencimiento < hoy;
  }

  /**
   * Determina si la factura requiere intervención de un revisor humano
   * (monto alto > umbral, estado pendiente de aprobación o proveedor con morosidad/omisión).
   */
  get requiereAtencionHumana() {
    return (
      this.requiere_aprobacion === true ||
      this.estado === 'pendiente_aprobacion' ||
      (Array.isArray(this.alertas_fiscales) && this.alertas_fiscales.length > 0)
    );
  }

  /**
   * Total formateado en moneda local.
   */
  get totalFormateado() {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: this.moneda || 'CRC',
      maximumFractionDigits: 2
    }).format(this.total);
  }

  /**
   * Subtotal formateado en moneda local.
   */
  get subtotalFormateado() {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: this.moneda || 'CRC',
      maximumFractionDigits: 2
    }).format(this.subtotal);
  }

  /**
   * Impuestos formateados en moneda local.
   */
  get impuestosFormateado() {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: this.moneda || 'CRC',
      maximumFractionDigits: 2
    }).format(this.impuestos);
  }

  /**
   * Clases Tailwind correspondientes al estado visual.
   */
  get estadoBadgeColor() {
    if (this.estaVencida) {
      return 'bg-red-500/10 text-red-400 border-red-500/30';
    }
    switch (this.estado) {
      case 'pagada':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'aprobada':
      case 'validada':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'pendiente_aprobacion':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'rechazada':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'pendiente':
      default:
        return 'bg-slate-500/10 text-slate-300 border-slate-500/30';
    }
  }

  /**
   * Etiqueta amigable para la interfaz.
   */
  get estadoEtiqueta() {
    if (this.estaVencida) return 'Vencida';
    switch (this.estado) {
      case 'pagada': return 'Pagada';
      case 'aprobada': return 'Aprobada';
      case 'validada': return 'Validada';
      case 'pendiente_aprobacion': return 'Pendiente Aprobación';
      case 'rechazada': return 'Rechazada';
      case 'pendiente': return 'Pendiente';
      default: return this.estado;
    }
  }
}
