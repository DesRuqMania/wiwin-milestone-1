# WIWIN API v1

Base path: `/api/v1`; JSON request/response bodies; browser sessions use HttpOnly cookies.

## Public endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/categories` | Active application categories |
| POST | `/applications` | Submit an application |
| GET | `/applications/track/:reference` | Read application status by reference |
| POST | `/nominations` | Submit a public nomination |

### Application payload

```json
{
  "fullName": "Example Applicant",
  "email": "applicant@example.com",
  "phone": "+2348000000000",
  "dateOfBirth": "1995-04-20",
  "location": "Lafia",
  "lga": "Lafia",
  "nasarawaConnection": "INDIGENE",
  "profession": "Software Developer",
  "categoryId": "category-uuid",
  "achievements": "A description of work and impact, at least ten characters.",
  "proposedTopic": "A proposed conversation topic",
  "motivation": "Why this story is worth exploring, at least ten characters.",
  "privacyConsent": true,
  "mediaConsent": false
}
```

Allowed `nasarawaConnection` values: `INDIGENE`, `BORN_IN_NASARAWA`, `LIVES_IN_NASARAWA`, `WORKS_IN_NASARAWA`, `CONTRIBUTOR`.

## Administrator endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/admin/auth/login` | Sign in |
| POST | `/admin/auth/logout` | Sign out |
| GET | `/admin/auth/me` | Current session |
| GET | `/admin/dashboard` | Dashboard counts |
| GET | `/admin/applications?page=1&limit=20&status=SUBMITTED` | Paginated applications |
| GET | `/admin/applications/:id` | Application details and review history |
| PATCH | `/admin/applications/:id/status` | Change application status and write review/audit record |
| GET | `/admin/nominations` | Latest nominations |

Status update payload:

```json
{ "status": "UNDER_REVIEW", "note": "Initial eligibility review." }
```

Application statuses: `SUBMITTED`, `UNDER_REVIEW`, `ADDITIONAL_INFORMATION_REQUIRED`, `SHORTLISTED`, `APPROVED`, `INVITED`, `ACCEPTED`, `SCHEDULED`, `INTERVIEWED`, `DECLINED`, `NOT_SELECTED`.

Responses use `{ "success": true, "data": ... }` or `{ "success": false, "message": ... }`. Validation errors return HTTP 400; unauthenticated requests return 401; insufficient permissions return 403; missing records return 404.
