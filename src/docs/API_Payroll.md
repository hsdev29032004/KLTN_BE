# API: Payroll (Bảng lương)

Endpoint: `GET /api/invoice/payroll`

Description:

- Lấy bảng lương (thống kê chi tiết) cho từng giảng viên trong khoảng thời gian.
- FE sẽ truyền `fromDate` và `toDate` (YYYY-MM-DD). Backend trả về chi tiết các mục (detail_invoices) gộp theo giảng viên cùng thông tin ngân hàng.

Request query params:

- `fromDate` (string, optional) — ngày bắt đầu, ví dụ: `2026-04-01`
- `toDate` (string, optional) — ngày kết thúc, ví dụ: `2026-04-30`

Example request:
GET /api/invoice/payroll?fromDate=2026-04-01&toDate=2026-04-30

Response shape:
{
"message": "Lấy bảng lương thành công",
"data": [
{
"teacherId": "uuid-teacher-1",
"fullName": "Nguyen Van A",
"email": "a@example.com",
"bankName": "NCB",
"bankNumber": "0123456789",
"totalSales": 300000,
"totalTeacherEarnings": 270000,
"detailInvoices": [
{
"id": "detail-invoice-id",
"course": { "id": "course-id", "name": "Course A" },
"invoiceId": "invoice-id",
"buyer": { "id": "buyer-uuid", "fullName": "Le Thi B", "email": "b@example.com" },
"price": 100000,
"commissionRate": 90,
"teacherEarnings": 90000,
"createdAt": "2026-04-05T..."
}
]
}
]
}

Notes for frontend implementation:

- FE will hardcode `fromDate` and `toDate` for the month (e.g., first and last day).
- The response is an array of teachers (users). For each teacher FE can render `bankName` and `bankNumber` to prepare payouts and use the `detailInvoices` array to display per-course items.
- `commissionRate` is the stored rate used to compute `teacherEarnings` as `Math.floor(price * commissionRate / 100)`.
- If a teacher has no bank information, `bankName` or `bankNumber` may be `null` — FE should handle that (e.g., show "No bank info").
- Endpoint requires `admin` role.

If you want additional fields (e.g., course slug, student info), tell me which and I can add them to the response.
