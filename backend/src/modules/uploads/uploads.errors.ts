export class UploadError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "UploadError";
    }
  }
  
  export class UploadTooLargeError extends UploadError {
    constructor(maxBytes: number) {
      super(`File exceeds maximum allowed size of ${maxBytes} bytes`);
    }
  }
  
  export class InvalidMimeTypeError extends UploadError {
    constructor(mimeType: string) {
      super(`MIME type not allowed: ${mimeType}`);
    }
  }
  
  export class UploadCategoryNotAllowedError extends UploadError {
    constructor(category: string) {
      super(`Upload category not allowed: ${category}`);
    }
  }

  export class UploadNotFoundError extends UploadError {
    constructor() {
      super("File not found");
    }
  }

  export class UploadAccessDeniedError extends UploadError {
    constructor() {
      super("Access denied");
    }
  }
