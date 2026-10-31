# Checklist Técnico - Validación Hostinger

**Proyecto:** Salud desde el Alma  
**Objetivo:** Validar prerrequisitos técnicos antes del despliegue en Hostinger  
**Fecha:** _______________  
**Responsable:** _______________

---

## 1. Acceso SSH

- [ ] **Conexión SSH funcional** - Conectarse al servidor con `ssh usuario@ip-servidor` o desde Terminal
- [ ] **Acceso con clave SSH** (recomendado) o usuario/contraseña configurado
- [ ] **Permisos de usuario** - Usuario con permisos para instalar paquetes, crear carpetas en home
- [ ] **Shell funcional** - Bash/Zsh disponible
- [ ] **Verificar conexión** - `whoami`, `pwd` responden correctamente

**Comandos de prueba:**
```bash
ssh <usuario>@<ip-hostinger>
whoami
pwd
```

---

## 2. Node.js

- [ ] **Node.js instalado** - Versión >= 22.0.0 (requerido por package.json)
- [ ] **npm instalado** - Versión >= 10.0.0
- [ ] **npx disponible**
- [ ] **PATH configurado correctamente**
- [ ] **Verificar en usuario correcto**

**Comandos de prueba:**
```bash
node -v
npm -v
npx -v
which node npm
```

**Acción si no está instalado:** Usar Node.js App Manager desde panel Hostinger o instalar via nvm.

---

## 3. PM2

- [ ] **PM2 instalado globalmente** - `npm install -g pm2`
- [ ] **PM2 accesible desde PATH**
- [ ] **pm2 startup configurado** (opcional pero recomendado para auto-inicio tras reboot)
- [ ] **pm2 save ejecutado** tras configurar procesos
- [ ] **Permisos correctos para PM2**

**Comandos de prueba:**
```bash
pm2 -v
pm2 list
pm2 --version
```

**Configuración recomendada:**
```bash
pm2 startup
# Seguir instrucciones que muestre el comando
pm2 save
```

---

## 4. Git

- [ ] **Git instalado** - `git --version`
- [ ] **Acceso a repositorio remoto** (GitHub)
- [ ] **Claves SSH para GitHub** configuradas o credenciales guardadas
- [ ] **Permisos para clonar/pullar**
- [ ] **Verificar conexión a GitHub**

**Comandos de prueba:**
```bash
git --version
ssh -T git@github.com  # Si usa SSH
# o
git ls-remote https://github.com/MauroMiranda0/saluddesdeelalma.org.git
```

**Acción:** Clonar repositorio en `~/apps/` o configurar rutas correctas.

---

## 5. DNS

- [ ] **Registro A para `saluddesdeelalma.org`** apuntando a IP de Hostinger
- [ ] **Registro A/CNAME para `www.saluddesdeelalma.org`** apuntando a IP de Hostinger
- [ ] **Registro A para `api.saluddesdeelalma.org`** apuntando a IP de Hostinger
- [ ] **Propagación DNS completa** - Verificar desde servidor o externo
- [ ] **Sin conflictos con otros registros**

**Comandos de prueba:**
```bash
nslookup saluddesdeelalma.org
nslookup www.saluddesdeelalma.org
nslookup api.saluddesdeelalma.org
# o
dig saluddesdeelalma.org +short
dig www.saluddesdeelalma.org +short
dig api.saluddesdeelalma.org +short
```

**Verificación externa:** Usar [dnschecker.org](https://dnschecker.org) para confirmar propagación global.

---

## 6. SSL

- [ ] **Certificado SSL instalado** para `saluddesdeelalma.org`
- [ ] **Certificado SSL instalado** para `www.saluddesdeelalma.org`
- [ ] **Certificado SSL instalado** para `api.saluddesdeelalma.org`
- [ ] **Redirección HTTP → HTTPS** configurada
- [ ] **Certificado válido** (no expirado)
- [ ] **Auto-renovación habilitada** (Let's Encrypt desde Hostinger)

**Comandos de prueba:**
```bash
curl -I https://saluddesdeelalma.org
curl -I https://www.saluddesdeelalma.org
curl -I https://api.saluddesdeelalma.org
```

**Verificación:** 
- Sin errores de certificado
- Código 200 o redirección válida
- Protocolo HTTPS visible

**Panel Hostinger:** Revisar `SSL/TLS` → Certificados activos.

---

## 7. Reverse Proxy

- [ ] **VirtualHost/Apache/Nginx configurado** para `saluddesdeelalma.org` y `www.saluddesdeelalma.org`
- [ ] **VirtualHost configurado** para `api.saluddesdeelalma.org`
- [ ] **Proxy reverso apuntando a `http://127.0.0.1:3000`** (frontend)
- [ ] **Proxy reverso apuntando a `http://127.0.0.1:4000`** (backend)
- [ ] **Headers correctos** (X-Forwarded-For, X-Forwarded-Proto)
- [ ] **WebSocket support** (si necesario) - No crítico para este proyecto
- [ ] **Timeouts configurados** adecuadamente
- [ ] **CORS manejado por Express** (no bloquear con proxy)

**Configuración esperada:**

**Para frontend (saluddesdeelalma.org):**
```apache
ProxyPreserveHost On
ProxyPass / http://127.0.0.1:3000/
ProxyPassReverse / http://127.0.0.1:3000/
```

**Para API (api.saluddesdeelalma.org):**
```apache
ProxyPreserveHost On
ProxyPass / http://127.0.0.1:4000/
ProxyPassReverse / http://127.0.0.1:4000/
```

**Comandos de prueba:**
```bash
curl -H "Host: saluddesdeelalma.org" http://127.0.0.1:3000
curl -H "Host: api.saluddesdeelalma.org" http://127.0.0.1:4000/api/v1/health
netstat -tlnp | grep -E ':(3000|4000)'
# o
ss -tlnp | grep -E ':(3000|4000)'
```

---

## 8. Validación Adicional

- [ ] **Carpetas creadas** - `~/apps/frontend`, `~/apps/backend`, `~/apps/logs`
- [ ] **Zona horaria configurada** - `TZ=America/Mexico_City`
- [ ] **Firewall/puertos** - Solo 80,443 expuestos públicamente. 3000,4000 solo localhost
- [ ] **Espacio en disco suficiente** - Mínimo 1-2GB libre
- [ ] **RAM disponible** - 1GB total (monitorear con PM2)
- [ ] **Variables de entorno listas** - `.env` para backend y `.env.production` para frontend
- [ ] **Supabase configurado** - `DATABASE_URL` obtenido y probado

**Comandos de prueba:**
```bash
timedatectl  # o date
df -h
free -h
ls -la ~/apps/
```

---

## 9. Checklist Final

- [ ] **Todo lo anterior validado** - Sin items pendientes críticos
- [ ] **Documentación revisada** - `docs/DEPLOY_PLAN.md` y `docs/DEPLOY_AUDIT.md` leídos
- [ ] **Ecosystem PM2 listo** - Archivos `ecosystem.config.js` creados
- [ ] **Plan de rollback preparado** - Conocer cómo revertir a commit anterior

**Firma de validación:** ___________________  
**Fecha:** ___________________

---

## Notas

- Si algún item falla, **NO** proceder con el despliegue hasta resolverlo
- Con 1GB RAM tener especial cuidado con `max_memory_restart` en PM2
- Los puertos 3000 y 4000 **NO** deben estar expuestos públicamente, solo vía reverse proxy
- Verificar siempre HTTPS antes de probar webhook de WhatsApp
