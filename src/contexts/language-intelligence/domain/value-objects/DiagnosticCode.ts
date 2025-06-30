import { Result } from "../../../../domain/shared/result.js"
import { ValidationError } from "../../../../domain/shared/result.js"

export class DiagnosticCode {
  private constructor(
    private readonly code: string,
    private readonly category: DiagnosticCategory,
    private readonly severity: 'error' | 'warning' | 'info'
  ) {}

  static create(code: string): Result<DiagnosticCode, ValidationError> {
    if (!code || code.trim().length === 0) {
      return {
        success: false,
        error: new ValidationError('Diagnostic code cannot be empty')
      };
    }

    const trimmedCode = code.trim();

    if (!/^[a-z]+-[a-z-]+$/.test(trimmedCode)) {
      return {
        success: false,
        error: new ValidationError('Diagnostic code must follow format: category-specific-code')
      };
    }

    const category = DiagnosticCode.extractCategory(trimmedCode);
    const severity = DiagnosticCode.extractSeverity(trimmedCode);

    return {
      success: true,
      data: new DiagnosticCode(trimmedCode, category, severity)
    };
  }

  static createSyntaxError(specificCode: string): Result<DiagnosticCode, ValidationError> {
    return DiagnosticCode.create(`syntax-${specificCode}`);
  }

  static createSemanticError(specificCode: string): Result<DiagnosticCode, ValidationError> {
    return DiagnosticCode.create(`semantic-${specificCode}`);
  }

  static createStyleWarning(specificCode: string): Result<DiagnosticCode, ValidationError> {
    return DiagnosticCode.create(`style-${specificCode}`);
  }

  static createEducationalInfo(specificCode: string): Result<DiagnosticCode, ValidationError> {
    return DiagnosticCode.create(`educational-${specificCode}`);
  }

  private static extractCategory(code: string): DiagnosticCategory {
    const categoryPart = code.split('-')[0];
    
    switch (categoryPart) {
      case 'syntax':
        return 'syntax';
      case 'semantic':
        return 'semantic';
      case 'style':
        return 'style';
      case 'educational':
        return 'educational';
      case 'performance':
        return 'performance';
      default:
        return 'general';
    }
  }

  private static extractSeverity(code: string): 'error' | 'warning' | 'info' {
    if (code.includes('error') || code.startsWith('syntax-') || code.startsWith('semantic-')) {
      return 'error';
    }
    
    if (code.includes('warning') || code.startsWith('style-') || code.startsWith('performance-')) {
      return 'warning';
    }
    
    return 'info';
  }

  getCode(): string {
    return this.code;
  }

  getCategory(): DiagnosticCategory {
    return this.category;
  }

  getSeverity(): 'error' | 'warning' | 'info' {
    return this.severity;
  }

  getDisplayCode(): string {
    return this.code.toUpperCase().replace(/-/g, '_');
  }

  getSpecificCode(): string {
    const parts = this.code.split('-');
    return parts.slice(1).join('-');
  }

  isSyntaxRelated(): boolean {
    return this.category === 'syntax';
  }

  isSemanticRelated(): boolean {
    return this.category === 'semantic';
  }

  isStyleRelated(): boolean {
    return this.category === 'style';
  }

  isEducationalRelated(): boolean {
    return this.category === 'educational';
  }

  isPerformanceRelated(): boolean {
    return this.category === 'performance';
  }

  isError(): boolean {
    return this.severity === 'error';
  }

  isWarning(): boolean {
    return this.severity === 'warning';
  }

  isInfo(): boolean {
    return this.severity === 'info';
  }

  matchesPattern(pattern: string): boolean {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(this.code);
  }

  belongsToCategory(category: DiagnosticCategory): boolean {
    return this.category === category;
  }

  equals(other: DiagnosticCode): boolean {
    return this.code === other.code;
  }

  toString(): string {
    return this.code;
  }
}

export type DiagnosticCategory = 
  | 'syntax' 
  | 'semantic' 
  | 'style' 
  | 'educational' 
  | 'performance' 
  | 'general';