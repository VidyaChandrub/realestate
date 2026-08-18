# Advertisements API Documentation

This document covers the newly added Advertisement APIs from `AdvertisementsController`.

Base path: `/advertisements`

## Common Notes

- Validation uses Nest global `ValidationPipe` with:
  - `whitelist: true`
  - `forbidNonWhitelisted: true`
- Enum values:
  - `placement`: `DASHBOARD_BANNER | JOB_LISTING | SIDEBAR | OTHER`
  - `status`: `ACTIVE | INACTIVE | EXPIRED`
  - `displayType`: `BANNER | CARD`
- Authentication:
  - Only `POST /advertisements` is explicitly guarded by `JwtAuthGuard` at controller level.
  - Other routes still use `req.user` in service logic for authorization in some cases, so they are effectively intended for authenticated use.

## Data Shapes

### CreateAdvertisementDto

```json
{
  "title": "string",
  "description": "string (optional)",
  "imageUrl": "string (optional, URL)",
  "htmlContent": "string (optional)",
  "youtubeUrl": "string (optional, URL)",
  "redirectUrl": "string (optional, URL)",
  "ctaText": "string (optional)",
  "startDateTime": "ISO date string",
  "endDateTime": "ISO date string",
  "placement": "DASHBOARD_BANNER | JOB_LISTING | SIDEBAR | OTHER",
  "priority": 0,
  "status": "ACTIVE | INACTIVE | EXPIRED",
  "displayType": "BANNER | CARD"
}
```

### UpdateAdvertisementDto

Partial of `CreateAdvertisementDto` (all fields optional).

### AdvertisementClickDto

```json
{
  "userId": "string",
  "metadata": "string (optional, JSON string)"
}
```

> Note: current service derives the clicked user from `req.user` profile and does not use incoming `userId` for persistence.

## Endpoints

---

### 1) Create Advertisement

- **Method**: `POST`
- **Path**: `/advertisements`
- **Auth**: Required (`JwtAuthGuard`) + user must have `admin` role in token (`realm_access.roles`)
- **Request Body**: `CreateAdvertisementDto`

#### Success Response (200)

Returns created advertisement with relations:

```json
{
  "id": "uuid",
  "organizationId": "uuid",
  "userId": "string",
  "title": "string",
  "description": "string | null",
  "imageUrl": "string | null",
  "htmlContent": "string | null",
  "youtubeUrl": "string | null",
  "redirectUrl": "string | null",
  "ctaText": "string | null",
  "startDateTime": "datetime",
  "endDateTime": "datetime",
  "placement": "enum",
  "priority": 0,
  "status": "enum",
  "displayType": "enum",
  "createdAt": "datetime",
  "updatedAt": "datetime",
  "organization": {},
  "targeting": []
}
```

#### Common Errors

- `403` Only admin users can create advertisements
- `404` Admin is not part of any organization
- `400` Validation errors

---

### 2) List Advertisements

- **Method**: `GET`
- **Path**: `/advertisements`
- **Auth**: Not explicitly guarded
- **Query Params** (optional):
  - `organizationId: string`
  - `status: ACTIVE | INACTIVE | EXPIRED`
  - `placement: DASHBOARD_BANNER | JOB_LISTING | SIDEBAR | OTHER`

#### Success Response (200)

Array of advertisements with:
- `organization`
- `targeting`

Ordered by `priority desc`.

---

### 3) List Visible Advertisements

- **Method**: `GET`
- **Path**: `/advertisements/visible`
- **Auth**: Not explicitly guarded (uses `req.user` if present)

#### Behavior

- Filters ads by active date window and `status = ACTIVE`.
- If user/profile exists, applies targeting checks on:
  - location
  - experience level
  - education level
  - skills

#### Success Response (200)

Array of advertisements with:
- `organization`
- `targeting`

---

### 4) Get Advertisement by ID

- **Method**: `GET`
- **Path**: `/advertisements/:id`
- **Auth**: Not explicitly guarded
- **Path Params**:
  - `id: string (advertisement id)`

#### Success Response (200)

Advertisement object with:
- `organization`
- `targeting`
- `clicks` (last 10, ordered by `clickedAt desc`)

#### Errors

- `404` Advertisement not found

---

### 5) Update Advertisement

- **Method**: `PUT`
- **Path**: `/advertisements/:id`
- **Auth**: Intended authenticated route (uses `req.user`), admin + ownership check in service
- **Path Params**:
  - `id: string`
- **Request Body**: `UpdateAdvertisementDto`

#### Success Response (200)

Updated advertisement with:
- `organization`
- `targeting`

#### Errors

- `404` Advertisement not found
- `403` Not allowed to update this advertisement
- `400` Validation errors

---

### 6) Delete Advertisement

- **Method**: `DELETE`
- **Path**: `/advertisements/:id`
- **Auth**: Intended authenticated route (uses `req.user`), admin + ownership check in service
- **Path Params**:
  - `id: string`

#### Success Response (200)

Deleted advertisement object.

#### Errors

- `404` Advertisement not found
- `403` Not allowed to delete this advertisement

---

### 7) Update Advertisement Status

- **Method**: `PATCH`
- **Path**: `/advertisements/:id/status`
- **Auth**: Intended authenticated route (uses `req.user`), admin + ownership check in service
- **Path Params**:
  - `id: string`
- **Request Body**:

```json
{
  "status": "ACTIVE | INACTIVE | EXPIRED"
}
```

#### Success Response (200)

Updated advertisement with:
- `organization`
- `targeting`

#### Errors

- `404` Advertisement not found
- `403` Not allowed to update status

---

### 8) Track Advertisement Click

- **Method**: `POST`
- **Path**: `/advertisements/:id/click`
- **Auth**: Intended authenticated route (uses `req.user`)
- **Path Params**:
  - `id: string`
- **Request Body**: `AdvertisementClickDto`

#### Success Response (200)

Created click record including:
- `advertisement`
- `user`

#### Errors

- `404` Advertisement not found
- `404` User profile not found
- `400` Validation/metadata parsing issues

---

### 9) Get Advertisement Clicks

- **Method**: `GET`
- **Path**: `/advertisements/:id/clicks`
- **Auth**: Not explicitly guarded
- **Path Params**:
  - `id: string`
- **Query Params** (optional):
  - `startDate: ISO date string`
  - `endDate: ISO date string`
  - `locationId: string`
  - `experienceLevelId: string`
  - `educationLevelId: string`

#### Success Response (200)

Array of click records with:
- `advertisement`
- `user`

Ordered by `clickedAt desc`.

#### Errors

- `404` Advertisement not found

---

### 10) Export Advertisement Clicks (CSV)

- **Method**: `GET`
- **Path**: `/advertisements/:id/clicks/export`
- **Auth**: Not explicitly guarded
- **Path Params**:
  - `id: string`
- **Query Params**: same as `/clicks`

#### Success Response (200)

CSV text string with headers:

`User ID,User Name,Email,Mobile Number,Location ID,Skill IDs,Experience Level ID,Education Level ID,Clicked At`

#### Errors

- `404` Advertisement not found

---

## Suggested Follow-up Improvements

- Add `@UseGuards(JwtAuthGuard)` to all routes that depend on `req.user`.
- Add Swagger decorators (`@ApiOperation`, `@ApiBody`, `@ApiResponse`) for auto-generated API docs.
- Add dedicated DTO for `PATCH /:id/status` body instead of raw `@Body('status')`.
