/**
 * Configuración hardcodeada de Free Works.
 * Por ahora las credenciales viven aquí (no usamos .env). En el futuro se
 * migrarán a variables de entorno VITE_APPWRITE_*.
 */

export const APPWRITE_CONFIG = {
  endpoint: "https://cloud.appwrite.io/v1",
  projectId: "6a3a9bfd00036f813523",
  databaseId: "freeworks",
  // API key de servidor. En el futuro, el cliente NO debería llevar esto:
  // las llamadas con permisos elevados deberían pasar por una Cloud Function.
  // Por ahora la usamos desde el navegador para acelerar el desarrollo.
  apiKey: "standard_976b2a93d1fab4af23fbc72d4327c419ea5508c9442af675d8456c37cf0d175d4378a047c06a9af3c7a8ea46934e30304c4b591cdd32324f1cd8cc74f1223d168e84b335da7a9c9a9a714d22931bde947d5bba24e8c3a5a1ea8941ac4c0fe7f49693ac1f68254bc9dce96c9bffa202dd66d9a3665494d5216ecc76f7c3fe9784",
};

/**
 * Nombres de las 16 colecciones Appwrite que usa Free Works.
 * Mantener este listado sincronizado con la consola de Appwrite.
 */
export const COLLECTIONS = {
  clientes: "clientes",
  trabajos: "trabajos",
  trabajoChecklist: "trabajo_checklist",
  trabajoTiempos: "trabajo_tiempos",
  trabajoMateriales: "trabajo_materiales",
  materiales: "materiales",
  presupuestos: "presupuestos",
  presupuestoLineas: "presupuesto_lineas",
  facturas: "facturas",
  facturaLineas: "factura_lineas",
  oportunidades: "oportunidades",
  calendario: "calendario",
  tecnicos: "tecnicos",
  comentarios: "comentarios",
  waitlist: "waitlist",
  adjuntos: "adjuntos",
} as const;

export type CollectionKey = keyof typeof COLLECTIONS;