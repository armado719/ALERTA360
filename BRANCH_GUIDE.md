# 🌍 ALERTA360 — Guía de Ramas

## 📌 Dos Ramas Disponibles

### **master** (v1 — Referencia Completa)
```bash
git checkout master
```
- ✅ Versión completa original
- 📚 Todas las documentaciones
- 📊 Resumen de construcción
- 🎯 Referencia del proyecto
- ✅ Todo funciona

**Mejor para:** Revisar documentación, entender arquitectura

---

### **feat/alerta360-v2-clean** (v2 — Recomendada para Desarrollo)
```bash
git checkout feat/alerta360-v2-clean
```
- ✅ Código limpio (0 TypeScript warnings)
- 🗑️ Archivos innecesarios eliminados
- 📱 Better mobile UX
- 🏗️ Estructura simplificada
- 📖 Documentación v2 + Comparativa

**Mejor para:** Desarrollar Fase 2, mantener código limpio

---

## 🔄 Diferencias

| Aspecto | v1 (master) | v2 (clean) |
|---------|-----------|-----------|
| TypeScript Warnings | 2 | 0 ✅ |
| Archivos innecesarios | 2 | 0 ✅ |
| Header Responsive | ✅ | ✅ Mejor |
| Código limpio | ✅ | ✅ Mejor |
| Features | 3/3 ✅ | 3/3 ✅ |
| Ready for Prod | ✅ | ✅ |

---

## 📝 Archivos por Rama

### v1 Tiene EXTRA:
- `CONSTRUCCION_COMPLETADA.txt` (Resumen)
- `PROYECTO_COMPLETADO.txt` (Resumen)
- `src/utils/cn.ts` (Utilidad no usada)

### v2 Tiene AGREGADO:
- `README_V2.md` (Guía v2)
- `COMPARATIVA_V1_VS_V2.md` (Diferencias)
- Código mejorado

---

## 🚀 Comandos Útiles

```bash
# Ver ramas
git branch -a

# Cambiar a v2 (recomendado)
git checkout feat/alerta360-v2-clean

# Ver diferencias
git diff master feat/alerta360-v2-clean

# Ver commits de v2
git log master..feat/alerta360-v2-clean

# Mergear v2 a master
git checkout master
git merge feat/alerta360-v2-clean

# Ejecutar proyecto actual
npm run dev
```

---

## ✅ Checklist: ¿Cuál Rama Usar?

### Usa **master (v1)** si:
- [ ] Quieres referencia completa
- [ ] Necesitas leer toda documentación
- [ ] Quieres historial detallado

### Usa **feat/alerta360-v2-clean (v2)** si:
- [x] Vas a desarrollar Fase 2
- [x] Prefieres código limpio
- [x] Quieres empezar fresco

**Recomendación: Usa v2 ⭐**

---

## 📊 Performance Ambas Ramas

- Build: ~3 segundos ⚡
- Bundle: ~114 kB (gzipped) 🎉
- Load Time: ~0.5s (4G)
- Features: 100% funcionales ✅

---

## 🎯 Próximo Paso

```bash
# Cambiar a v2 (recomendada)
git checkout feat/alerta360-v2-clean

# Ejecutar
npm run dev

# Abre http://localhost:5173
```

¡Listo! 🚀
