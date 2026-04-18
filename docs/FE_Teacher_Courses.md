API: Lấy danh sách khóa học của giảng viên và xử lý "Ngừng kinh doanh"

Tóm tắt
- Endpoint lấy danh sách khóa học cho giảng viên: `GET /course/user/:userId` (xem controller).
- Khi giảng viên chọn "Ngừng kinh doanh" cho một khóa học, backend hiện chỉ cập nhật `status` thành `stopped` (không xóa dữ liệu). Việc này thực hiện qua route `DELETE /course/:courseId` (giảng viên), hiện gọi `courseService.deleteCourse`.

Vị trí code
- Route lấy danh sách: [src/modules/course/course.controller.ts](src/modules/course/course.controller.ts#L24-L44)
- Hành vi dừng kinh doanh: [src/modules/course/course.service.ts](src/modules/course/course.service.ts#L990-L1002)

Endpoints (FE implement)

1) Lấy danh sách khóa học của giảng viên
- Method: GET
- URL: `/course/user/:userId`
- Auth: public (nếu muốn), nhưng trong controller hiện là `@PublicAPI()`
- Response shape (thông dụng):
  {
    "message": "Lấy danh sách khóa học theo user thành công",
    "data": [
      {
        "id": "...",
        "name": "...",
        "slug": "...",
        "thumbnail": "...",
        "price": 0,
        "star": 0,
        "status": "published|draft|pending|update|stopped|...",
        "studentCount": 123,
        "createdAt": "2026-04-18T...",
        "user": { "id":"...","fullName":"...","avatar":"..." },
        "courseTopics": [ { "topic": { "id":"...","name":"...","slug":"..." } } ]
      }
    ]
  }

FE notes for rendering the list
- Show all courses returned by this endpoint. The backend will return courses whose `isDeleted` is `false` — that includes `status: stopped`.
- UI should display a clear badge for stopped courses, e.g. "Ngừng kinh doanh". Example rule: if `course.status === 'stopped'` then show red badge and change available actions.
- Note: Students who have already purchased a course will still be able to access the course materials even when the course status is `stopped`.
- Actions for stopped courses (suggested):
  - Allow "Mở bán trở lại" (re-publish) button — implement as calling course update or publish flow in backend.
  - Disable "Chỉnh sửa nội dung" if you want to block edits, or keep edits allowed depending on product rules.
  - Do NOT show "Xóa" action for stopped courses (since backend no longer deletes by this endpoint).

2) Dừng kinh doanh (hiện triển khai trên backend)
- Method: DELETE
- URL: `/course/:courseId`
- Auth: `Roles('teacher')` (token required, backend checks owner)
- Behavior: backend updates `course.status = 'stopped'` and returns success message. Nó KHÔNG set `isDeleted = true`.
- Sample response:
  { "message": "Cập nhật trạng thái khóa học thành \"ngừng kinh doanh\" thành công" }

FE handling after stopping a course
- After successful DELETE, update UI state to reflect `status: 'stopped'` (or re-fetch the teacher's course list).
- Keep course visible in the teacher list; allow teacher to drill into course details and restore if desired.

- Note: The student "purchased" endpoint (`GET /course/purchased`) will include courses with `status === 'stopped'`, so buyers will still see and access stopped courses in their purchased list.

Compatibility notes for student / public views
- Public listing and student views use different endpoints that filter by `status` (e.g., only `published`, `update`, `need_update`). Stopped courses will not appear in public search or student purchased lists unless the backend logic changes there.
- FE should continue to use existing public endpoints for students; no change required unless you want stopped courses to appear publicly.

Implementation checklist for FE devs
- [ ] Call `GET /course/user/:userId` to show teacher's courses.
- [ ] Render `status` badge for `stopped` and appropriate action buttons.
- [ ] When teacher clicks "Ngừng kinh doanh", call `DELETE /course/:courseId` and on success update UI (optimistic or refetch).
- [ ] Ensure error handling and authorization flows (401/403) are shown to users.

3) Mở bán lại (reopen)
- Method: POST
- URL: `/course/:courseId/reopen`
- Auth: `Roles('teacher')` (token required, backend checks owner)
- Behavior: backend sets `course.status = 'published'` and updates `publishedAt` if it was null. IMPORTANT: backend does NOT update lesson/material/exam statuses — only the course `status` is changed.
- Sample response:
  { "message": "Mở bán khóa học thành công" }

FE handling after reopening
- After successful POST, update UI to show course as `published` (refetch teacher course list or update local state).
- If your UI shows lesson/material publish states, note they are unchanged — you may want to surface a warning to the teacher that only the course visibility changed.

If you want, I can also add a small React component snippet demonstrating the list rendering and the "Mở bán trở lại" call.
