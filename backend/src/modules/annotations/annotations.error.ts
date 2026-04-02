
export class AnnotationError extends Error {}

export class AnnotationNotFoundError extends AnnotationError {
    constructor() { super("Image not found"); this.name = "AnnotationNotFoundError"; }
}

export class AnnotationAccessDeniedError extends AnnotationError {
    constructor() { super("Access denied"); this.name = "AnnotationAccessDeniedError"; }
}

export class AnnotationPayloadTooLargeError extends AnnotationError {
    constructor() { super("Too many annotation objects"); this.name = "AnnotationPayloadTooLargeError"; }
}

export class AnnotationUnsupportedTypeError extends AnnotationError {
    constructor() { super("Annotations are only supported on JPEG images"); this.name = "AnnotationUnsupportedTypeError"; }
}
