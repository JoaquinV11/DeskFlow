# DeskFlow API

Backend de un sistema **HelpDesk B2B** (mesa de ayuda) orientado a roles, con **timeline/auditoría**, **workflow de tickets** y **métricas**.

Proyecto backend-first construido con **NestJS**, **Prisma** y **PostgreSQL**, enfocado en demostrar diseño de dominio, reglas de negocio y autorización por roles.

---

## ✨ Qué resuelve DeskFlow

DeskFlow simula un sistema de soporte interno/empresarial donde:

- **Usuarios finales** crean tickets y comentan su problema
- **Agentes de soporte** gestionan tickets, agregan notas internas y cambian estados
- **Admins** tienen acceso total y visión global (incluyendo métricas)

El objetivo del proyecto es modelar una API **realista** de helpdesk, no solo un CRUD básico.

---

## 🧱 Stack

- **Node.js**
- **NestJS**
- **Prisma ORM (v7)**
- **PostgreSQL**
- **JWT** (autenticación)
- **Passport** (estrategia JWT)
- **Docker Compose** (DB local)
- **Swagger / OpenAPI** (`/docs`)

---

## ✅ Features implementadas

### Auth & Roles
- Login con JWT (`/auth/login`)
- Endpoint protegido `/auth/me`
- Roles:
  - `USER`
  - `AGENT`
  - `ADMIN`
- Guards de autorización por rol

### Tickets
- Crear ticket
- Listar tickets (con permisos por rol)
- Ver detalle de ticket
- Asignar ticket a agente/admin
- Cambiar estado con transiciones válidas

### Timeline / Auditoría
- Eventos por ticket (`CREATED`, `MESSAGE`, `ASSIGNED`, `STATUS_CHANGED`, etc.)
- Mensajes públicos e internos (`PUBLIC` / `INTERNAL`)
- Visibilidad filtrada por rol:
  - `USER` solo ve eventos `PUBLIC`
  - `AGENT` / `ADMIN` ven `PUBLIC` + `INTERNAL`

### Reglas de negocio
- Usuarios finales no pueden crear notas internas
- Tickets en estado final (`CLOSED` / `CANCELLED`) no aceptan mensajes
- Validación de transiciones de estado
- Restricción de acceso por ownership (usuario final solo ve sus tickets)

### Métricas
- Endpoint `GET /metrics/overview` (solo `AGENT` / `ADMIN`)
- Totales por estado
- Tickets sin asignar
- Tickets creados/cerrados en los últimos 7 días

---

## 👥 Roles y permisos (resumen)

### USER
- ✅ Crear ticket
- ✅ Ver sus propios tickets
- ✅ Comentar en sus tickets (solo `PUBLIC`)
- ❌ Asignar tickets
- ❌ Cambiar estados
- ❌ Ver notas internas

### AGENT
- ✅ Ver todos los tickets
- ✅ Comentar (`PUBLIC` / `INTERNAL`)
- ✅ Asignar tickets
- ✅ Cambiar estados
- ✅ Ver métricas

### ADMIN
- ✅ Todo lo de AGENT
- ✅ Acceso total a tickets y métricas

---

## 🔄 Workflow de estados

Estados implementados:

- `OPEN`
- `IN_PROGRESS`
- `WAITING_USER`
- `CLOSED`
- `CANCELLED`

### Transiciones válidas
- `OPEN -> IN_PROGRESS | CANCELLED`
- `IN_PROGRESS -> WAITING_USER | CLOSED | CANCELLED`
- `WAITING_USER -> IN_PROGRESS | CLOSED | CANCELLED`
- `CLOSED ->` _(sin transición en esta versión)_
- `CANCELLED ->` _(sin transición en esta versión)_

> Además, para pasar a `IN_PROGRESS`, el ticket debe tener un responsable asignado.

---

## 🕒 Timeline / Eventos

Cada ticket mantiene un historial cronológico de eventos (`TicketEvent`), por ejemplo:

- `CREATED`
- `MESSAGE`
- `ASSIGNED`
- `STATUS_CHANGED`

Esto permite auditar:
- quién hizo una acción
- cuándo la hizo
- qué cambió (estado, asignación, etc.)
- si el evento es visible al usuario final (`PUBLIC`) o interno (`INTERNAL`)

---

## 📚 Documentación API (Swagger)

Swagger UI disponible en:

- **`/docs`** (por ejemplo `http://localhost:3000/docs`)

La API usa prefijo global:

- **`/api`** (por ejemplo `http://localhost:3000/api/tickets`)

---

## 🚀 Cómo correr el proyecto localmente

### 1) Clonar e instalar dependencias

```bash
pnpm install
```

### 2) Levantar PostgreSQL con Docker

```bash
docker compose up -d
```

### 3) Configurar variables de entorno (`.env`)

Crear archivo `.env` en la raíz del proyecto:

```env
DATABASE_URL="postgresql://deskflow:deskflow@localhost:5432/deskflow?schema=public"
JWT_SECRET="super-secret-dev"
```

> Prisma v7 usa `prisma.config.ts` para leer la URL de conexión, que toma `DATABASE_URL` desde `.env`.

### 4) Generar cliente Prisma

```bash
pnpm prisma generate
```

### 5) Ejecutar migraciones

```bash
pnpm prisma migrate dev
```

### 6) Cargar datos de demo (seed)

```bash
pnpm seed
```

### 7) Levantar la API

```bash
pnpm start:dev
```

La API debería quedar disponible en:

- `http://localhost:3000/api`
- `http://localhost:3000/docs`

---

## 🔐 Credenciales demo

El seed crea tres usuarios (password: **`demo123`**):

- **admin@demo.com** → `ADMIN`
- **agent@demo.com** → `AGENT`
- **user@demo.com** → `USER`

---

## 🔌 Endpoints principales

### Health
- `GET /api/health`
- `GET /api/health/db`

### Auth
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/auth/test/admin`
- `GET /api/auth/test/support`

### Tickets
- `POST /api/tickets`
- `GET /api/tickets`
- `GET /api/tickets/:id`
- `GET /api/tickets/:id/events`
- `POST /api/tickets/:id/events/message`
- `POST /api/tickets/:id/assign`
- `POST /api/tickets/:id/status`

### Metrics
- `GET /api/metrics/overview`

---

## 🧪 Ejemplo de flujo (demo)

1. Login como `user@demo.com`
2. Crear ticket
3. Comentar ticket (`PUBLIC`)
4. Login como `agent@demo.com`
5. Agregar nota interna (`INTERNAL`)
6. Asignar ticket
7. Cambiar estado `OPEN -> IN_PROGRESS -> WAITING_USER`
8. Login como `admin@demo.com`
9. Cerrar ticket
10. Revisar `/api/metrics/overview`

---

## 🗂️ Estructura del proyecto (resumen)

```text
src/
  auth/
  prisma/
  tickets/
  metrics/
  app.controller.ts
  app.module.ts
  main.ts

prisma/
  schema.prisma
  migrations/
  seed.ts
```

---

## 🧠 Decisiones de diseño (resumen)

- **Timeline basado en eventos** en lugar de “comentarios sueltos”
  - facilita auditoría y extensibilidad
- **Visibilidad de eventos (`PUBLIC` / `INTERNAL`)**
  - separa comunicación con usuario final vs notas internas de soporte
- **Roles + guards**
  - control de acceso explícito por endpoint
- **Reglas de transición de estados**
  - modelado de negocio más realista que un CRUD de status libre

---

## 📈 Próximas mejoras (roadmap)

- [ ] Paginación en tickets y eventos
- [ ] Filtros y búsqueda (`status`, `priority`, `assignedTo`, `q`)
- [ ] CRUD de categorías y tags
- [ ] Attachments reales (upload + storage)
- [ ] Más métricas (por agente, por prioridad, tendencias)
- [ ] Tests e2e / integración
- [ ] Frontend mínimo (dashboard/lista/detalle)
- [ ] Deploy público (API + DB)

---

## 📌 Estado del proyecto

Proyecto en desarrollo activo como portfolio backend-focused, con foco en:
- diseño de API
- reglas de negocio
- autorización
- mantenibilidad

---

## 👨‍💻 Autor

Desarrollado por **Joaquín** como proyecto de portfolio para roles **Backend / Full Stack (backend-oriented)**.
