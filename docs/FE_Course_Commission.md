**FE Guide: Per-course commission (`commissionRate`)**

- **Purpose:** Frontend must provide a per-course commission percentage when creating/updating a course. Backend uses this value (0–100, can be decimal) for all purchase/settlement calculations; system-level commission remains in DB but is no longer used for purchases.

**Field**
- `commissionRate`: number (decimal allowed), percentage between 0 and 100.
  - Example: `10`, `5.5`, `0`, `100`

**Validation (backend)**
- Required on create. Error responses:
  - Missing on create: 400, message: `Trường commissionRate là bắt buộc`.
  - Invalid value (not number or out of range): 400, message: `Tỷ lệ hoa hồng không hợp lệ (0-100)`.

**Create course**
- Endpoint: `POST /api/course` (multipart/form-data)
- Required form fields (example):
  - `name` (string)
  - `price` (number)
  - `thumbnail` (string or file)
  - `content` (string)
  - `description` (string)
  - `commissionRate` (number)  <-- MUST be provided

- Example FormData (JS):
  - `fd.append('name', 'My Course')`
  - `fd.append('price', '100000')`
  - `fd.append('commissionRate', '10.5')`
  - `fd.append('thumbnail', file)`

- Successful response (200):
  {
    "message": "Tạo khóa học thành công",
    "data": {
      "id": "...",
      "name": "My Course",
      "price": 100000,
      "commissionRate": 10.5,
      ...
    }
  }

**Update course**
- Endpoint: `PUT /api/course/:id` (multipart/form-data)
- `commissionRate` is optional on update. If provided, backend validates (0–100).
- Successful response (200) returns updated `commissionRate` in course object.

**Get course detail (for pre-fill when editing)**
- Endpoint: `GET /api/course/:key`
- Response includes `commissionRate` field inside the returned `course` object. Use it to prefill the edit form.

**Purchase flow (checkout)**
- Backend no longer reads system commission for purchases. During invoice/detail creation the backend stores the course `commissionRate` snapshot into `detail_invoices.commissionRate`.
- Frontend should not rely on a system-level commission during checkout; if it shows estimated instructor earnings, use `detail_invoices` returned from the create-invoice response or the purchase summary endpoint.

**Example: purchase response (snippet)**
- After creating invoice, frontend will receive a payment payload with `invoiceId` and `paymentUrl`.
- After successful payment, `detail_invoices` rows will contain per-course `commissionRate` used for settlement, e.g.:
  {
    "courseId": "...",
    "price": 100000,
    "commissionRate": 10.5,
    "status": "paid"
  }

**FE Implementation notes**
- Treat `commissionRate` as a decimal number (can be string in FormData). Coerce to Number before sending and format when showing (e.g., `10.5%`).
- Validate on the client side (optional) to improve UX: require numeric value in range 0–100.
- Use `GET /api/course/:key` to prefill the edit form.
- Do not call system config endpoints to read commission when doing purchase-related UI; backend will provide per-course commission in invoice/detail endpoints.

**Errors to show to users**
- If backend returns `Trường commissionRate là bắt buộc`: show "Vui lòng nhập tỷ lệ hoa hồng (0–100%)".
- If backend returns `Tỷ lệ hoa hồng không hợp lệ (0-100)`: show "Tỷ lệ hoa hồng phải là số trong khoảng 0–100".

If you want, I can also add a short UI validation helper and an example React form snippet for create/update to include in this doc.