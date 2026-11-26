# UniTrack CMS — Software Engineering Architecture & Diagrams

## 1. Normalized 3NF Entity-Relationship Diagram

The database schema strictly enforces Third Normal Form (3NF) across four core entities: `USER`, `COURSE`, `ENROLLMENT`, and `ATTENDANCE`. A self-referencing relationship on `COURSE` models prerequisite dependencies, while composite unique constraints prevent duplicate enrollments and duplicate attendance entries for the same session date.

```mermaid
erDiagram
    USER {
        string id PK
        string name
        string email UK
        string enrollmentNo "Nullable (e.g. BCA2026001)"
        enum role "ADMIN | FACULTY | STUDENT"
        datetime createdAt
    }

    COURSE {
        string id PK
        string code UK "e.g. BCA-301"
        string title
        string description
        int credits
        int semester
        int maxSeats
        string prerequisiteId FK "Nullable self-reference"
        string facultyId FK
        datetime createdAt
    }

    ENROLLMENT {
        string id PK
        string studentId FK
        string courseId FK
        enum status "ENROLLED | COMPLETED | DROPPED"
        int internalMarks "Nullable (0-30)"
        datetime enrolledAt
    }

    ATTENDANCE {
        string id PK
        string enrollmentId FK
        datetime date
        enum status "PRESENT | ABSENT"
    }

    USER ||--o{ COURSE : "teaches (facultyId)"
    COURSE ||--o{ COURSE : "is prerequisite for (prerequisiteId)"
    USER ||--o{ ENROLLMENT : "enrolls in (studentId)"
    COURSE ||--o{ ENROLLMENT : "has students (courseId)"
    ENROLLMENT ||--o{ ATTENDANCE : "tracks sessions (enrollmentId)"
```

---

## 2. CBCS Enrollment Validation Algorithm (`POST /api/enroll`)

Before committing a student enrollment record, the API executes four sequential server-side integrity checks inside a transactional workflow. Any rule violation aborts the operation with HTTP `400 Bad Request` and a descriptive diagnostic message.

```mermaid
flowchart TD
    A["Receive POST /api/enroll (studentId, courseId)"] --> B["Authenticate Session & Fetch Course + Existing Enrollment"]
    B --> C{"Course exists?"}
    C -- "No" --> D["Return HTTP 404 (Course not found)"]
    C -- "Yes" --> E{"Existing status is ENROLLED or COMPLETED?"}
    E -- "Yes" --> F["Return HTTP 400 (Duplicate enrollment blocked)"]
    E -- "No" --> G{"Course has prerequisiteId?"}
    G -- "Yes" --> H["Query Enrollment for (studentId, prerequisiteId)"]
    H --> I{"Prerequisite status == COMPLETED?"}
    I -- "No" --> J["Return HTTP 400 (Missing prerequisite course)"]
    I -- "Yes" --> K{"Active ENROLLED count >= course.maxSeats?"}
    G -- "No" --> K
    K -- "Yes" --> L["Return HTTP 400 (Seat capacity full)"]
    K -- "No" --> M["Sum credits of student's active ENROLLED courses"]
    M --> N{"currentCredits + course.credits > 24?"}
    N -- "Yes" --> O["Return HTTP 400 (24-credit semester cap exceeded)"]
    N -- "No" --> P{"Previous enrollment status == DROPPED?"}
    P -- "Yes" --> Q["Update status to ENROLLED & reset timestamp"]
    P -- "No" --> R["Create new Enrollment record (status = ENROLLED)"]
    Q --> S["Return HTTP 201 / 200 with updated enrollment"]
    R --> S
```

---

## 3. Attendance Threshold & Safe Deletion Rules

- **Attendance Calculation:** For any enrollment with `totalSessions > 0`, percentage is computed dynamically as `Math.round((presentSessions / totalSessions) * 100)`. Values strictly below `75%` raise a critical academic warning flag across Student and Faculty dashboards.
- **Safe Course Deletion (`DELETE /api/courses/[id]`):** Queries active enrollments where `status === 'ENROLLED'`. If count > `0`, deletion is rejected with HTTP `400` to protect student academic records.
