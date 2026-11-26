# UniTrack CMS — Black-Box Functional Test Report

**System Under Test:** UniTrack CMS (CBCS & Prerequisite-Aware Course Management System)  
**Testing Methodology:** Black-Box Equivalence Partitioning & Boundary Value Analysis  
**Target Interfaces:** `/api/enroll`, `/api/courses/[id]`, `/api/attendance`, Role Portals (`/student`, `/faculty`, `/admin`)

---

## Black-Box Test Matrix (`TC-01` to `TC-08`)

| Test ID | Feature / Rule | Actor & Preconditions | Input / Action | Expected System Output | Actual Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-01** | **Valid Enrollment & Prerequisite Pass** | **Rahul Das** (`BCA2026012`) has `COMPLETED` `BCA-101` (`Programming in C`) and holds `20 / 24` active credits. `BCA-201` (`Data Structures`, `4` credits) requires `BCA-101` and has `0 / 40` seats filled. | Click **Enroll** on `BCA-201` (`POST /api/enroll` with `{ courseId: "course-bca-201" }`). | HTTP `201` Created. Prerequisite check passes (`BCA-101 == COMPLETED`), credit total updates from `20 / 24` to `24 / 24`, seat counter increments to `1 / 40`, and badge changes to `Enrolled`. | **PASS** |
| **TC-02** | **Prerequisite Check Failure** | **Priya Patel** (`BCA2026001`) has `0` completed courses (`BCA-101` is only `ENROLLED`, not `COMPLETED`). | Attempt to enroll in `BCA-201` (`Data Structures`, requires `BCA-101`). | HTTP `400` Bad Request. Enrollment rejected with message: *"Prerequisite not met: BCA-101 (Programming in C) must be completed before enrolling in BCA-201 (Data Structures)."* | **PASS** |
| **TC-03** | **24-Credit Semester Cap Overflow** | **Rahul Das** has `24 / 24` active credits (after enrolling in `BCA-201`, or `20 / 24` attempting a `5`-credit course). | Attempt to enroll in another open course whose credits push `currentCredits + newCourse.credits > 24`. | HTTP `400` Bad Request. Enrollment blocked with message explaining current credits, new course credits, and the `24`-credit maximum CBCS cap. | **PASS** |
| **TC-04** | **Seat Capacity Full Rejection** | `BCA-401` (`Cloud & AI Elective`) has `maxSeats: 2`. Rahul Das (`1/2`) and Priya Patel (`2/2`) occupy both available seats. | A third or non-enrolled student attempts `POST /api/enroll` for `BCA-401`. | HTTP `400` Bad Request. Enrollment blocked with message: *"Seat capacity reached: BCA-401 is full (2/2 seats occupied)."* | **PASS** |
| **TC-05** | **Duplicate Enrollment Prevention** | **Rahul Das** is already `ENROLLED` in `BCA-301` (`DBMS`) and has `COMPLETED` `BCA-101` (`Programming in C`). | Send `POST /api/enroll` for `BCA-301` or `BCA-101`. | HTTP `400` Bad Request. Rejected with clear duplicate status message (*"Already enrolled in BCA-301"* / *"Course BCA-101 already completed"*). | **PASS** |
| **TC-06** | **Safe Course Deletion Block** | **Dr. R. Sharma** (`ADMIN`) is on `/admin`. Course `BCA-301` (`DBMS`) has `2` active `ENROLLED` students (Rahul & Priya). | Click **Delete** on `BCA-301` (`DELETE /api/courses/course-bca-301`). | HTTP `400` Bad Request. Deletion blocked to preserve active student records, returning count of active enrollments. Unenrolled courses (0 `ENROLLED`) delete with HTTP `200`. | **PASS** |
| **TC-07** | **Course Drop & Re-Enrollment Flow** | **Priya Patel** is `ENROLLED` in `BCA-301` (`6` credits). | Click **Drop** (`POST /api/enroll/drop`), verify active credits decrease by `6`, then click **Enroll** again on `BCA-301`. | Drop sets status to `DROPPED` (HTTP `200`), freeing seat & `6` credits. Subsequent re-enroll re-activates the existing `[studentId, courseId]` row cleanly without unique constraint error. | **PASS** |
| **TC-08** | **Attendance `< 75%` Alert Detection** | **Priya Patel** has `2 / 4` sessions `PRESENT` (`50%`) in `BCA-301` (`DBMS`) and `5 / 8` overall (`63%`). | View **Student Dashboard** (`/student`) and **Faculty Attendance View** (`/faculty`), or mark another `ABSENT` session (`POST /api/attendance`). | Dynamic calculation computes `50%` (`< 75%` with `totalSessions > 0`), rendering a critical red `#CC0000` `< 75% Attendance Alert` badge and warning banner; Rahul (`92%`) displays green `On Track`. | **PASS** |

---

## Boundary & Edge-Case Notes

- **Zero-Session Edge Case (`totalSessions === 0`):** Newly enrolled courses with `0` recorded sessions display `N/A` / `No sessions yet` and do **not** falsely trigger the `< 75%` low-attendance warning.
- **Internal Marks Bounds:** `PATCH /api/enrollments/[id]/marks` enforces integer range `0 <= internalMarks <= 30`, rejecting out-of-range values with HTTP `400`.
- **Circular / Self-Prerequisite Prevention:** Admin course creation and editing disallow setting a course as its own prerequisite (`prerequisiteId === id`) with HTTP `400`.
