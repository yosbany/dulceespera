# Dulce Espera — Baby Shower de Anisley & Maikol

Lista de regalos para el Baby Shower de **Anisley & Maikol**.

Los invitados entran desde el celular, eligen un regalito y reservan cupos en tiempo real. No hay backend propio, VPS, PHP, Google Sheets ni Google Apps Script.

La app se publica en **GitHub Pages** y usa:

- Firebase Authentication anónima
- Firebase Realtime Database

URL final esperada:

[https://dulceespera.nrdonline.site/](https://dulceespera.nrdonline.site/)

Mientras el dominio custom no esté apuntado, GitHub Pages también puede servir:

[https://yosbany.github.io/dulceespera/](https://yosbany.github.io/dulceespera/)

## 1. Qué hace la aplicación

- Muestra el catálogo de regalos del bebé.
- Permite reservar 1 o más unidades según el cupo de cada regalo.
- Muestra **Tus regalos elegidos** solo al invitado actual.
- Permite quitar solamente las reservas propias.
- Actualiza disponibilidad en tiempo real entre distintos celulares.
- No muestra apellidos, ni “Gender Reveal”, ni nombres de otros invitados.

## 2. Arquitectura

Frontend estático:

- Vite
- JavaScript vanilla
- HTML / CSS
- Firebase JS SDK modular

Identidad:

- Firebase Anonymous Authentication
- `auth.currentUser.uid` es el dueño de cada reserva
- `localStorage` solo recuerda el nombre escrito (`dulceespera_guest_name`)

Publicación:

- GitHub Pages
- GitHub Actions al hacer push a `main`
- Sin Firebase Hosting

## 3. Firebase utilizado

Proyecto:

`dulceespera-98785`

Servicios:

- Authentication → Anonymous
- Realtime Database

No se usa:

- Cloud Functions
- Firebase Admin en el navegador
- Firebase Hosting
- Storage
- Firestore

La configuración pública de Firebase no es un secreto. Lo que nunca debe entrar al repo es:

- service account
- private keys
- tokens de GitHub
- database secrets

## 4. Instalación

```bash
npm install
```

## 5. Desarrollo

```bash
npm run dev
```

Antes de que la app funcione contra Firebase hay que pegar el `databaseURL` real. Ver sección 7.

## 6. Build

```bash
npm run build
npm run preview
```

Vite está configurado con `base: './'` para que los assets funcionen tanto en:

- `https://yosbany.github.io/dulceespera/`
- `https://dulceespera.nrdonline.site/`

## 7. Cómo configurar la API key y el `databaseURL`

La config web de Firebase no se commitea en el código. El hook de secretos bloquea claves `AIza...` en el repo.

Creá `.env.local`:

```bash
cp .env.example .env.local
```

Y dejá:

```bash
VITE_FIREBASE_API_KEY=la-api-key-web-de-firebase
VITE_FIREBASE_DATABASE_URL=https://TU-URL-REAL
```

La API key web está en Firebase Console → ⚙️ Project settings → General → Your apps.

La config que se usó para crear el proyecto **no incluye** `databaseURL`. No se inventó uno.

Cómo copiarlo desde Firebase Console:

1. Entrá a [Firebase Console](https://console.firebase.google.com/).
2. Abrí el proyecto `dulceespera-98785`.
3. Andá a **Build → Realtime Database**.
4. Si todavía no existe, creala. Elegí la región que prefieras.
5. Copiá la URL. Suele verse así:
   - `https://dulceespera-98785-default-rtdb.firebaseio.com`
   - o `https://dulceespera-98785-default-rtdb.REGION.firebasedatabase.app`
6. Pegala exactamente. No inventes la región.

Hasta que eso esté, la app muestra una pantalla de configuración y no intenta hablar con la base.

## 8. Cómo ejecutar el seed

El navegador público **no crea** los regalos.

```bash
npm run seed
```

El script:

- se conecta al mismo proyecto Firebase;
- si `/gifts` ya tiene datos, no los pisa;
- con `--force` actualiza definiciones y crea slots faltantes, sin borrar reservas existentes.

```bash
npm run seed -- --force
```

El seed usa **Firebase Admin solo en tu máquina**. No va al frontend.

Pasos:

1. Firebase Console → ⚙️ Project settings → Service accounts.
2. Generate new private key.
3. Guardala como `serviceAccount.json` en la raíz del repo.
4. Ese archivo ya está en `.gitignore`.
5. Configurá `VITE_FIREBASE_DATABASE_URL` en `.env.local`.
6. Corré `npm run seed`.

Alternativa sin service account: en Realtime Database → ⋮ → Import JSON, usando un JSON armado con el catálogo de `src/seed-data.js`.

## 9. Cómo desplegar las reglas de Firebase

```bash
npm install -g firebase-tools
firebase login
firebase use dulceespera-98785
firebase deploy --only database
```

`firebase.json` apunta únicamente a `firebase-database.rules.json`. No hay Firebase Hosting.

## 10. Cómo habilitar Anonymous Authentication

1. Firebase Console → Authentication → Sign-in method.
2. Habilitá **Anonymous**.
3. Guardá.

La app, al abrir:

1. inicializa Firebase;
2. mira `auth.currentUser`;
3. si no hay sesión, ejecuta `signInAnonymously(auth)`;
4. espera el `uid`;
5. usa siempre ese `uid` como dueño de las reservas.

El UID no se muestra al invitado. Si recarga el mismo navegador, Firebase mantiene la sesión anónima.

## 11. Cómo habilitar Realtime Database

1. Firebase Console → Build → Realtime Database → Create database.
2. Empezá en modo bloqueado.
3. Pegá el `databaseURL` en el proyecto.
4. Desplegá las reglas de este repo.
5. Ejecutá el seed.

## 12. Cómo configurar GitHub Pages

1. Subí el repo a `yosbany/dulceespera`.
2. Settings → Secrets and variables → Actions. Creá:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_DATABASE_URL`
3. Settings → Pages → Build and deployment → Source: **GitHub Actions**.
   No uses "Deploy from a branch" sobre `main`. Eso publica el código fuente y rompe Firebase (`firebase/app`) y el manifest.
4. El workflow `.github/workflows/deploy-pages.yml` construye y publica `dist` en cada push a `main`.

No hace falta Node, PHP ni un VPS en producción.

## 13. Cómo configurar el custom domain

1. En GitHub → Settings → Pages → Custom domain.
2. Cargá `dulceespera.nrdonline.site`.
3. Esperá el certificado HTTPS.
4. El archivo `public/CNAME` ya contiene ese dominio y Vite lo copia a `dist`.

## 14. DNS

En tu proveedor DNS, **no** apuntes a ningún VPS ni a `179.43.124.107`.

Creá:

| Tipo | Host | Destino |
| --- | --- | --- |
| CNAME | `dulceespera` | `yosbany.github.io` |

Eso deja `dulceespera.nrdonline.site` sirviendo GitHub Pages.

## 15. Cómo probar una reserva

1. Abrí la app en el celular o en el navegador.
2. Tocá **🎁 Elegir**.
3. Escribí tu nombre.
4. Si el regalo tiene más de 1 cupo, elegí la cantidad. El máximo es lo que queda.
5. Confirmá.
6. Tiene que aparecer el toast de gracias y el regalo en **Tus regalos elegidos**.

## 16. Cómo probar la liberación

1. En **Tus regalos elegidos**, tocá el regalo.
2. Confirmá **Quitar reserva**.
3. El cupo vuelve a quedar disponible.
4. Otro celular tiene que ver el cambio sin recargar.

Solo se pueden borrar reservas cuyo `userId` implícito es `auth.uid`. Las reglas impiden borrar las ajenas.

## 17. Cómo comprobar concurrencia

Caso del último cupo:

1. Dejá un regalo con `total = 1` o con 1 slot libre.
2. Abrí la app en dos celulares o dos ventanas privadas distintas (otra identidad anónima).
3. Reservá al mismo tiempo.

Uno tiene que ganar. El otro recibe un error amable o ve **Completado**. Nunca pueden quedar 2 reservas sobre 1 cupo.

Eso no se hace leyendo `remaining` y después escribiendo. Se reclaman slots concretos. Las reglas solo permiten tomar un slot si todavía está vacío. El `update()` de Firebase aplica todos los cambios juntos: o se reservan los slots y se crea la reserva propia, o no se escribe nada.

## 18. Qué datos puede leer cada usuario

Un invitado autenticado puede leer:

- `/gifts` — catálogo público
- `/giftSlots` — qué cupos están tomados
- `/userReservations/{suUid}` — solamente sus reservas, incluyendo su nombre

No puede leer:

- `/userReservations/{otroUid}`
- el `guestName` de otra persona

En `/giftSlots` sí puede verse el `uid` anónimo de quien tomó un cupo. No es un nombre ni un apellido. Es la contraparte necesaria para que las reglas sepan quién puede liberar ese cupo.

La interfaz nunca muestra UIDs ni nombres ajenos.

## 19. Reglas de seguridad

Archivo: `firebase-database.rules.json`

- `gifts`: lectura autenticada, escritura bloqueada para clientes.
- `giftSlots/{giftId}/{slotId}`: solo se puede escribir un slot que ya existe (creado por el seed). Un usuario puede tomarlo si está vacío y dejar su `auth.uid`, o liberarlo si es el dueño.
- `userReservations/{uid}`: cada usuario lee y escribe únicamente su rama. Puede crear o borrar, no editar. `quantity >= 1` y no puede superar el `total` del regalo. `guestName` entre 2 y 80 caracteres.

Lo que un cliente no puede hacer:

- cambiar nombres o cupos de regalos;
- crear slots extra;
- escribir `reserved = 999`;
- reservar a nombre de otro `uid`;
- borrar reservas ajenas;
- descargar “invitado → regalos” de otras personas.

Limitación honesta de una solución 100% cliente: un usuario malicioso podría tomar todos los slots vacíos o reclamar cupos sin completar el flujo de la UI. No puede generar overbooking ni leer nombres ajenos. Evitar eso por completo requeriría Cloud Functions. En esta versión no se usan.

## 20. Cómo agregar regalos después

1. Editá `src/seed-data.js`.
2. Usá un ID estable nuevo: `gift-047`, `gift-048`, etc.
3. No uses el nombre como ID.
4. Corré:

```bash
npm run seed -- --force
```

Eso actualiza `/gifts` y crea los slots faltantes. No resetea reservas ya tomadas.

## Modelo de Realtime Database

```text
/gifts/{giftId}
  category
  name
  description
  total
  active
  order

/giftSlots/{giftId}/{slotId}
  claimedBy      // "" o auth.uid
  reservationId

/userReservations/{uid}/{reservationId}
  giftId
  giftName
  quantity
  guestName
  createdAt
```

No se guardan `remaining`, `reserved` ni `available`. Se calculan en el cliente:

```text
reserved  = cantidad de slots con claimedBy no vacío
remaining = total - reserved
```

Se eligió **slots precreados** en vez de `/giftCounters/{giftId}/reserved` porque un contador escrito por el cliente no se puede proteger bien con reglas de RTDB. Un usuario podría poner `reserved = 999` o `reserved = 0` desde DevTools. Con un slot por cupo eso es imposible: solo existen `total` casilleros, creados por el seed, y cada uno se toma o se libera con dueño.

`remaining` y `regalos elegidos` se actualizan con `onValue()`.

## Contadores de la home

- **Regalos disponibles:** cantidad de *tipos* de regalo con `remaining > 0`.
- **Regalos elegidos:** suma total de unidades reservadas.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm install` | Instala dependencias |
| `npm run dev` | Servidor local |
| `npm run build` | Build estático para Pages |
| `npm run preview` | Sirve `dist` |
| `npm run seed` | Carga inicial de regalos |
| `firebase deploy --only database` | Publica reglas |

## Estructura

```text
/
  index.html
  package.json
  vite.config.js
  firebase.json
  .firebaserc
  firebase-database.rules.json
  README.md
  src/
    main.js
    firebase.js
    styles.css
    gifts.js
    reservations.js
    ui.js
    seed-data.js
  scripts/
    seed.js
  public/
    CNAME
    manifest.webmanifest
    favicon.svg
  .github/workflows/deploy-pages.yml
```

Es una sola página. No hay router. Así se evitan problemas de GitHub Pages con rutas SPA.

Hay un `manifest.webmanifest` para agregar la app al inicio. No hay service worker ni caches agresivos.

## Checklist rápido después del primer deploy

1. Crear `.env.local` con `VITE_FIREBASE_API_KEY` y `VITE_FIREBASE_DATABASE_URL`.
2. Cargar los mismos valores como secrets de GitHub Actions.
3. Habilitar Anonymous Authentication.
4. Crear Realtime Database.
5. Desplegar reglas.
6. Ejecutar `npm run seed`.
7. Push a `main`.
8. Activar GitHub Pages con GitHub Actions.
9. Crear el CNAME `dulceespera → yosbany.github.io`.
10. Verificar HTTPS en `dulceespera.nrdonline.site`.
