import "server-only";

import { google, type classroom_v1 } from "googleapis";

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

export interface GoogleClassroomAdapterConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export class GoogleClassroomProviderError extends Error {
  readonly category: ClassroomErrorCategory;
  readonly retryable: boolean;

  constructor(
    category: ClassroomErrorCategory,
    message: string,
    retryable: boolean
  ) {
    super(message);
    this.name = "GoogleClassroomProviderError";
    this.category = category;
    this.retryable = retryable;
  }
}

function isGoogleClassroomProviderError(
  error: unknown
): error is GoogleClassroomProviderError {
  return error instanceof GoogleClassroomProviderError;
}

function apiErrorStatus(error: unknown): number {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "status" in error.response
  ) {
    return Number(error.response.status);
  }
  return 0;
}

function apiErrorCode(error: unknown): string | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response &&
    error.response.data &&
    typeof error.response.data === "object" &&
    "error" in error.response.data &&
    error.response.data.error &&
    typeof error.response.data.error === "object" &&
    "code" in error.response.data.error
  ) {
    return String(error.response.data.error.code);
  }
  return null;
}

function mapGoogleApiError(error: unknown): GoogleClassroomProviderError {
  if (isGoogleClassroomProviderError(error)) return error;

  const status = apiErrorStatus(error);
  const code = apiErrorCode(error);

  if (code === "ALREADY_EXISTS" || status === 409) {
    return new GoogleClassroomProviderError(
      "ALREADY_ENROLLED",
      "Student is already enrolled in this course",
      false
    );
  }
  if (status === 400 && code === "INVALID_ARGUMENT") {
    return new GoogleClassroomProviderError(
      "INVALID_EMAIL",
      "The student email address is invalid",
      false
    );
  }
  if (status === 401) {
    return new GoogleClassroomProviderError(
      "UNAUTHORIZED",
      "Google Classroom authorization failed",
      false
    );
  }
  if (status === 403) {
    return new GoogleClassroomProviderError(
      "FORBIDDEN",
      "Google Classroom access is forbidden",
      false
    );
  }
  if (status === 404) {
    return new GoogleClassroomProviderError(
      "COURSE_NOT_FOUND",
      "Google Classroom course was not found",
      false
    );
  }
  if (status === 429) {
    return new GoogleClassroomProviderError(
      "RATE_LIMITED",
      "Google Classroom rate limit reached",
      true
    );
  }
  const retryable = status === 0 || status >= 500;
  return new GoogleClassroomProviderError(
    retryable ? "UNKNOWN" : "UNKNOWN",
    "Google Classroom could not complete the request",
    retryable
  );
}

export class GoogleClassroomAdapter implements ClassroomAdapter {
  constructor(private readonly config: GoogleClassroomAdapterConfig) {}

  private client(): classroom_v1.Classroom {
    const oauth = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret
    );
    oauth.setCredentials({ refresh_token: this.config.refreshToken });
    return google.classroom({ version: "v1", auth: oauth });
  }

  async listConfiguredCourses(): Promise<ClassroomCourse[]> {
    const classroom = this.client();
    try {
      const response = await classroom.courses.list({
        pageSize: 100,
        courseStates: ["ACTIVE"],
      });
      return (response.data.courses ?? []).map((course) => ({
        id: course.id ?? "",
        name: course.name ?? "",
        alternateLink: course.alternateLink ?? undefined,
      }));
    } catch (error) {
      throw mapGoogleApiError(error);
    }
  }

  async getCourse(courseId: string): Promise<ClassroomCourse> {
    const classroom = this.client();
    try {
      const response = await classroom.courses.get({ id: courseId });
      return {
        id: response.data.id ?? courseId,
        name: response.data.name ?? "",
        alternateLink: response.data.alternateLink ?? undefined,
      };
    } catch (error) {
      throw mapGoogleApiError(error);
    }
  }

  async checkEnrollment(
    courseId: string,
    studentEmail: string
  ): Promise<boolean> {
    const classroom = this.client();
    try {
      await classroom.courses.students.get({
        courseId,
        userId: studentEmail,
      });
      return true;
    } catch (error) {
      if (apiErrorStatus(error) === 404) return false;
      throw mapGoogleApiError(error);
    }
  }

  async enrollStudent(input: EnrollStudentInput): Promise<EnrollStudentResult> {
    const classroom = this.client();
    const { courseId, studentEmail } = input;

    try {
      const response = await classroom.courses.students.create({
        courseId,
        requestBody: { userId: studentEmail },
      });
      return {
        studentId: response.data.userId ?? null,
        alreadyEnrolled: false,
        errorCategory: null,
        providerResponse: response.data,
      };
    } catch (error) {
      if (isGoogleClassroomProviderError(error)) {
        if (error.category === "ALREADY_ENROLLED") {
          return {
            studentId: null,
            alreadyEnrolled: true,
            errorCategory: "ALREADY_ENROLLED",
            providerResponse: null,
          };
        }
        return {
          studentId: null,
          alreadyEnrolled: false,
          errorCategory: error.category,
          providerResponse: null,
        };
      }
      const mapped = mapGoogleApiError(error);
      if (mapped.category === "ALREADY_ENROLLED") {
        return {
          studentId: null,
          alreadyEnrolled: true,
          errorCategory: "ALREADY_ENROLLED",
          providerResponse: null,
        };
      }
      return {
        studentId: null,
        alreadyEnrolled: false,
        errorCategory: mapped.category,
        providerResponse: null,
      };
    }
  }
}

export function createClassroomAdapter(
  config?: GoogleClassroomAdapterConfig
): ClassroomAdapter {
  const cfg: GoogleClassroomAdapterConfig = config ?? {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN || "",
  };
  return new GoogleClassroomAdapter(cfg);
}

export default createClassroomAdapter;
