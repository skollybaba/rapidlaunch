import "server-only";

export interface ClassroomCourse {
  id: string;
  name: string;
  alternateLink?: string;
}

export type ClassroomErrorCategory =
  | "INVALID_EMAIL"
  | "FORBIDDEN"
  | "COURSE_NOT_FOUND"
  | "ALREADY_ENROLLED"
  | "RATE_LIMITED"
  | "UNAUTHORIZED"
  | "UNKNOWN";

export interface EnrollStudentInput {
  courseId: string;
  studentEmail: string;
}

export interface EnrollStudentResult {
  studentId: string | null;
  alreadyEnrolled: boolean;
  errorCategory: ClassroomErrorCategory | null;
  providerResponse: unknown;
}

export interface ClassroomAdapter {
  listConfiguredCourses(): Promise<ClassroomCourse[]>;

  getCourse(courseId: string): Promise<ClassroomCourse>;

  enrollStudent(input: EnrollStudentInput): Promise<EnrollStudentResult>;

  checkEnrollment(courseId: string, studentEmail: string): Promise<boolean>;
}