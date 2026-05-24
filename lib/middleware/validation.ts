import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/utils/api-response";
import { sanitizeInput, isValidEmail, isValidObjectId } from "@/lib/utils/validation";

/**
 * Sanitize all string fields in an object recursively
 */
export function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeInput(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Validate request body against a schema
 */
export interface ValidationRule {
  type: 'string' | 'number' | 'boolean' | 'email' | 'objectId' | 'phone' | 'array';
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean;
  errorMessage?: string;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export function validateBody(body: any, schema: ValidationSchema): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [field, rule] of Object.entries(schema)) {
    const value = body[field];

    // Check required
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(rule.errorMessage || `${field} is required`);
      continue;
    }

    // Skip validation if field is not required and not provided
    if (!rule.required && (value === undefined || value === null || value === '')) {
      continue;
    }

    // Type validation
    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(rule.errorMessage || `${field} must be a string`);
        } else {
          if (rule.min && value.length < rule.min) {
            errors.push(rule.errorMessage || `${field} must be at least ${rule.min} characters`);
          }
          if (rule.max && value.length > rule.max) {
            errors.push(rule.errorMessage || `${field} must be at most ${rule.max} characters`);
          }
          if (rule.pattern && !rule.pattern.test(value)) {
            errors.push(rule.errorMessage || `${field} has invalid format`);
          }
        }
        break;

      case 'number':
        if (typeof value !== 'number' && isNaN(Number(value))) {
          errors.push(rule.errorMessage || `${field} must be a number`);
        } else {
          const numValue = Number(value);
          if (rule.min !== undefined && numValue < rule.min) {
            errors.push(rule.errorMessage || `${field} must be at least ${rule.min}`);
          }
          if (rule.max !== undefined && numValue > rule.max) {
            errors.push(rule.errorMessage || `${field} must be at most ${rule.max}`);
          }
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(rule.errorMessage || `${field} must be a boolean`);
        }
        break;

      case 'email':
        if (!isValidEmail(value)) {
          errors.push(rule.errorMessage || `${field} must be a valid email`);
        }
        break;

      case 'objectId':
        if (!isValidObjectId(value)) {
          errors.push(rule.errorMessage || `${field} must be a valid ID`);
        }
        break;

      case 'phone':
        if (!/^[0-9]{10}$/.test(value)) {
          errors.push(rule.errorMessage || `${field} must be a valid 10-digit phone number`);
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          errors.push(rule.errorMessage || `${field} must be an array`);
        } else {
          if (rule.min && value.length < rule.min) {
            errors.push(rule.errorMessage || `${field} must have at least ${rule.min} items`);
          }
          if (rule.max && value.length > rule.max) {
            errors.push(rule.errorMessage || `${field} must have at most ${rule.max} items`);
          }
        }
        break;
    }

    // Custom validation
    if (rule.custom && !rule.custom(value)) {
      errors.push(rule.errorMessage || `${field} failed custom validation`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Middleware to validate and sanitize request body
 */
export async function validateRequest(
  req: NextRequest,
  schema: ValidationSchema
): Promise<{ valid: boolean; body?: any; error?: Response }> {
  try {
    const body = await req.json();
    
    // Sanitize input
    const sanitizedBody = sanitizeObject(body);
    
    // Validate
    const validation = validateBody(sanitizedBody, schema);
    
    if (!validation.valid) {
      return {
        valid: false,
        error: errorResponse(validation.errors.join(', '), 400),
      };
    }
    
    return {
      valid: true,
      body: sanitizedBody,
    };
  } catch (error) {
    return {
      valid: false,
      error: errorResponse('Invalid request body', 400),
    };
  }
}
