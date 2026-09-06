# ALERTA360 Infrastructure Health — Especificación Funcional del MVP
*Escenario de trabajo — HIPOTÉTICO, no validado en campo*

> ⚠️ **Nota obligatoria de uso:** este documento cierra sus valores con un escenario de trabajo (Vertical = Minería, Cliente = "Minera Ejemplo S.A." — **ficticio, no es un cliente real**), para que sirva de base concreta a OpenCode. No sustituye la validación de campo (Fase 0, aún pendiente). Si al validar sale otro vertical/activo/protocolo, este documento se vuelve a cerrar con los datos reales — varias secciones cambiarían (especialmente 4, 5, 7 y 8).

---

## 0. Valores del escenario de trabajo (equivalente a los placeholders ya resueltos)

| Dato | Valor de trabajo | Estado |
|---|---|---|
| Vertical | Minería | Hipotético — pendiente de confirmar en Fase 0 |
| Cliente piloto | "Minera Ejemplo S.A." | Ficticio, sin contraparte real todavía |
| Tipo de activo | Sensores geotécnicos de monitoreo de taludes (inclinómetros/piezómetros) | Hipotético |
| Cantidad de activos del piloto | 20 sensores | Cifra de trabajo, ajustable |
| Protocolo de telemetría | HTTP webhook / API REST | Hipotético — el más simple, puede cambiar si el protocolo real es distinto (Modbus, SDI-12, etc.) |
| Intervalo de transmisión esperado | Cada 5 minutos (300 s) | Cifra de trabajo, típica de monitoreo geotécnico, ajustable con ficha técnica real |
| Canal de notificación | Telegram | Elegido por simplicidad de integración para el MVP |

---

## 1. Alcance del MVP

**Incluye:**
- Ingesta de telemetría de sensores geotécnicos de taludes vía HTTP webhook
- Cálculo de Health Score por activo (sección 4)
- Cálculo de Alerting Capability agregado (sección 5)
- Dashboard de estado para Minera Ejemplo S.A.
- Notificación técnica por Telegram
- Registro de eventos (caída/recuperación) con auditoría básica

**No incluye (recordatorio, no repetir el error inicial):**
- Ningún otro tipo de activo fuera de sensores geotécnicos de taludes
- Integración con IDEAM/SGC/UNGRD/SAT
- Mapa geoespacial
- Cualquier automatización de decisión o autorización

---

## 2. Usuarios y roles

| Rol | Quién es (escenario de trabajo) | Qué puede hacer |
|---|---|---|
| Operador | Operador de sala de control / geotecnia | Ver dashboard, recibir notificaciones, marcar incidente como atendido |
| Administrador | Jefe de geotecnia / instrumentación | Configurar umbrales, gestionar usuarios, ver histórico completo |
| ALERTA360 (nosotros) | Equipo de soporte del piloto | Acceso de solo lectura para diagnóstico, sin modificar datos del cliente |

---

## 3. Historias de usuario

```
Como [rol],
quiero [ver el estado de mis activos de un vistazo / recibir una notificación cuando un activo se degrada / consultar el historial de un incidente],
para [poder actuar antes de que la falla se vuelva crítica / justificar ante mi jefatura qué pasó y cuándo].
```

**Historias mínimas del MVP:**
1. Ver Health Score de cada sensor de talud en tiempo casi real.
2. Recibir notificación por Telegram cuando un activo cambia de estado saludable → degradado → crítico.
3. Ver el detalle de por qué cambió el score de un activo específico (principio "no caja negra", Project Master sección 8).
4. Ver el Alerting Capability agregado de los 20 sensores del piloto.
5. Consultar histórico de un incidente puntual (cuándo empezó, cuándo se detectó, cuándo se resolvió).

---

## 4. Health Score — reglas de cálculo (escenario de trabajo, ajustable con ficha técnica real)

| Dimensión | Regla genérica | Regla de trabajo para sensores de talud |
|---|---|---|
| Disponibilidad | ¿Llegó algún dato en el intervalo esperado? | Sin dato en 2× el intervalo esperado (10 min) → Disponibilidad en rojo |
| Frescura | Tiempo desde última transmisión válida vs. intervalo esperado | 0-5 min: verde · 5-10 min: amarillo · más de 10 min: rojo |
| Calidad | ¿El valor está dentro de rango físicamente plausible? | Ejemplo de trabajo: desplazamiento fuera de −100 mm a +100 mm, o presión de poro fuera de 0-500 kPa → Calidad en rojo (rango real a confirmar por tipo exacto de sensor) |
| Consistencia | ¿El valor varía de forma razonable en el tiempo (no congelado)? | Mismo valor exacto repetido en 3+ lecturas consecutivas (≥15 min sin variación) → Consistencia en rojo ("dato congelado") |
| Comunicación | ¿Hay degradación de latencia/errores en la conexión? | Más del 20% de intentos de ingesta fallidos en ventana de 30 min → Comunicación en rojo |

**Regla de prioridad (hereda del Project Master, sección 9):** si Disponibilidad/Frescura están en verde pero Consistencia o Calidad están en rojo, el estado final mostrado es `⚠️ DATOS NO CONFIABLES`, nunca `🟢 saludable`.

**Bandas de estado:**
- 100 → Saludable
- 80–99 → Degradación leve
- 60–79 → Degradación importante
- 0–59 → Crítico

---

## 5. Alerting Capability — regla de agregación (escenario de trabajo)

Para un solo tipo de activo (Project Master, sección 9.1): promedio ponderado por criticidad operativa.

**Regla de trabajo:** de los 20 sensores, aquellos ubicados en zonas de talud activo/inestable (ejemplo de trabajo: 5 de los 20) pesan doble en el promedio agregado respecto a los sensores de zonas perimetrales/estables (los 15 restantes). Fórmula:

```
Alerting Capability = (Σ Health_i × peso_i) / (Σ peso_i)
donde peso_i = 2 si el sensor i está en zona crítica, 1 en caso contrario
```

**Criticidad real** (cuáles sensores son "zona crítica") se confirma con el equipo de geotecnia del cliente piloto real — la asignación de 5 de 20 aquí es un ejemplo de trabajo, no una proporción fija.

---

## 6. Pantallas del MVP (wireframe funcional, no visual)

### 6.1 Dashboard principal
- Health Score agregado (Alerting Capability) en la parte superior
- Lista/grid de 20 activos con su Health Score individual y última transmisión
- Indicador visual de estado (verde/amarillo/rojo) + distinción explícita "offline" vs. "datos no confiables" (Project Master, sección 9)

### 6.2 Detalle de activo
- Las 5 dimensiones del Health Score de ese activo, con su valor actual
- Gráfico de histórico reciente (últimas 24-48 horas)
- Log de eventos de ese activo

### 6.3 Historial de incidentes
- Lista de incidentes pasados (activo, cuándo empezó, cuándo se detectó, cuándo se resolvió, quién lo atendió)

---

## 7. Reglas de notificación

| Evento | Condición | Canal | Destinatario |
|---|---|---|---|
| Activo pasa a degradado | Health Score cruza de banda "saludable" a "degradación leve/importante" | Telegram | Operador |
| Activo pasa a crítico | Health Score < 60 | Telegram | Operador + Administrador |
| Activo se recupera | Health Score vuelve a "saludable" | Telegram | Operador |
| Datos no confiables (falso saludable) | Disponibilidad OK pero Consistencia/Calidad en rojo | Telegram | Operador |

**Regla de anti-spam (resuelta):** no reenviar la misma alerta del mismo activo más de una vez cada 30 minutos mientras el estado no cambie. Si el estado cambia (ej. de degradado a crítico), se notifica de inmediato sin esperar la ventana.

---

## 8. Criterios de aceptación del MVP (escenario de trabajo)

- [ ] El sistema ingiere telemetría real (o simulada, mientras no haya cliente real) de los 20 activos sin intervención manual.
- [ ] El Health Score se actualiza dentro de un margen razonable respecto al intervalo de 5 minutos esperado.
- [ ] Al menos un caso (real o simulado) de degradación fue detectado y notificado con adelanto medible (criterio de éxito del piloto, Project Master sección 13 — incluye también falsos positivos y uptime propio, no solo esta detección aislada).
- [ ] El operador puede explicar, sin ayuda externa, por qué el sistema marcó un activo como degradado (principio "no caja negra").
- [ ] Si ALERTA360 se cae, el sistema de monitoreo original del cliente (si existe) sigue funcionando sin cambios (principio fail-safe).

**Nota:** mientras no exista cliente piloto real, estos criterios se validan con datos simulados/de prueba — son criterios de aceptación técnica del MVP, no todavía del piloto comercial (ese es un documento distinto, el Acuerdo de Piloto).

---

## 9. Fuera de alcance explícito de esta especificación

No se especifica en este documento — se queda para fases posteriores si el MVP demuestra valor:
- Cualquier otro tipo de activo fuera de sensores geotécnicos de taludes
- Multi-cliente / multi-tenant
- Mapa geoespacial
- Integración con fuentes gubernamentales
- Cualquier motor de decisión o autorización automática

---

## 10. Qué cambia si Fase 0 arroja un resultado distinto

Si la validación de campo real termina eligiendo otro vertical/activo/protocolo, esto es lo que se reescribe en este documento (y lo que sobrevive sin cambios):

**Se reescribe:** secciones 0, 1 (tipo de activo), 4 (rangos físicos y umbrales), 5 (qué hace crítico a un activo), 7 (si cambia el canal de notificación).

**Sobrevive sin cambios:** estructura general de roles (sección 2), forma de las historias de usuario (sección 3), estructura de pantallas (sección 6), principios de fail-safe/no-caja-negra (heredados del Project Master).
