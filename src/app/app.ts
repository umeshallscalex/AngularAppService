import { HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, Inject, PLATFORM_ID } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthCredentials, AuthService } from './auth.service';
import { DepartmentDetails, DepartmentService } from './department.service';
import {
  EmployeeDetails,
  EmployeeSearchResult,
  EmployeeService,
} from './employee.service';
import { StudentDetails, StudentRecord, StudentService } from './student.service';

@Component({
  imports: [FormsModule],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  authStatus: 'checking' | 'authenticated' | 'unauthenticated' = 'checking';
  authMode: 'login' | 'register' = 'login';
  authCredentials: AuthCredentials = { username: '', password: '' };
  username = '';
  authErrorMessage = '';
  authSuccessMessage = '';
  isSubmittingAuth = false;
  isLoggingOut = false;
  activeTab: 'employee' | 'department' | 'student' | 'employee-search' = 'employee';
  employeeDetails: EmployeeDetails = {
    departmentID: 0,
    empId: 0,
    empName: '',
  };
  employees: EmployeeDetails[] | null = null;
  isLoadingEmployees = false;
  employeesErrorMessage = '';
  editingEmployeeId: number | null = null;
  employeeEditDetails: EmployeeDetails | null = null;
  isUpdatingEmployee = false;
  employeeUpdateErrorMessage = '';
  deletingEmployeeId: number | null = null;
  employeeDeleteErrorMessage = '';
  employeeServiceUnavailable = false;
  private employeeLoadRequestId = 0;
  departmentDetails: DepartmentDetails = {
    departmentID: 0,
    departmentName: '',
  };
  departments: DepartmentDetails[] | null = null;
  isLoadingDepartments = false;
  departmentsErrorMessage = '';
  private departmentLoadRequestId = 0;
  studentDetails: StudentDetails = {
    studentId: 0,
    studentName: '',
    departmentId: 0,
  };
  students: StudentRecord[] | null = null;
  isLoadingStudents = false;
  studentsErrorMessage = '';
  private studentLoadRequestId = 0;
  searchEmployeeId: number | null = null;
  employeeSearchResults: EmployeeSearchResult[] | null = null;
  isSubmittingEmployee = false;
  isSubmittingDepartment = false;
  isSubmittingStudent = false;
  isSearchingEmployee = false;
  employeeErrorMessage = '';
  employeeSuccessMessage = '';
  departmentErrorMessage = '';
  departmentSuccessMessage = '';
  studentErrorMessage = '';
  studentSuccessMessage = '';
  employeeSearchErrorMessage = '';

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly employeeService: EmployeeService,
    private readonly departmentService: DepartmentService,
    private readonly studentService: StudentService,
    private readonly changeDetector: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private readonly platformId: object,
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.authMode = this.router.url.startsWith('/register') ? 'register' : 'login';
      this.checkSession();
    } else {
      this.authStatus = 'unauthenticated';
    }
  }

  checkSession(): void {
    this.authService.getSession().subscribe({
      next: (session) => {
        this.authStatus = session.authenticated
          ? 'authenticated'
          : 'unauthenticated';
        this.username = session.username ?? '';
        if (session.authenticated) {
          this.router.navigateByUrl('/home');
          this.loadEmployees();
        } else if (this.router.url !== '/register') {
          this.router.navigateByUrl('/login');
        }
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        this.authStatus = 'unauthenticated';
        this.authErrorMessage = this.getAuthErrorMessage(
          error,
          'Could not verify your session. Please try again.',
        );
        this.router.navigateByUrl('/login');
        this.changeDetector.markForCheck();
      },
    });
  }

  setAuthMode(mode: 'login' | 'register'): void {
    if (this.isSubmittingAuth) {
      return;
    }

    this.authMode = mode;
    this.authErrorMessage = '';
    this.authSuccessMessage = '';
    this.router.navigateByUrl(`/${mode}`);
  }

  submitAuth(form: NgForm): void {
    if (form.invalid || this.isSubmittingAuth) {
      return;
    }

    this.isSubmittingAuth = true;
    this.authErrorMessage = '';
    this.authSuccessMessage = '';
    const credentials = { ...this.authCredentials };

    if (this.authMode === 'register') {
      this.authService.register(credentials).subscribe({
        next: (response) => {
          this.isSubmittingAuth = false;
          this.authMode = 'login';
          this.authCredentials = { username: credentials.username, password: '' };
          this.authSuccessMessage = response.message || 'Account created.';
          this.router.navigateByUrl('/login');
          this.changeDetector.markForCheck();
        },
        error: (error: unknown) => {
          this.authErrorMessage = this.getAuthErrorMessage(
            error,
            'Could not create your account. Please try again.',
          );
          this.isSubmittingAuth = false;
          this.changeDetector.markForCheck();
        },
      });
      return;
    }

    this.authService.login(credentials).subscribe({
      next: () => {
        this.authService.getSession().subscribe({
          next: (session) => {
            this.isSubmittingAuth = false;
            if (!session.authenticated) {
              this.authStatus = 'unauthenticated';
              this.authErrorMessage = 'Login was not confirmed by the server.';
              this.changeDetector.markForCheck();
              return;
            }

            this.username = session.username ?? credentials.username;
            this.authCredentials = { username: this.username, password: '' };
            this.authStatus = 'authenticated';
            this.router.navigateByUrl('/home');
            this.loadEmployees();
            this.changeDetector.markForCheck();
          },
          error: (error: unknown) => {
            this.isSubmittingAuth = false;
            this.authErrorMessage = this.getAuthErrorMessage(
              error,
              'Login succeeded, but the session could not be verified.',
            );
            this.changeDetector.markForCheck();
          },
        });
      },
      error: (error: unknown) => {
        this.authErrorMessage = this.getAuthErrorMessage(
          error,
          'Login failed. Check your username and password.',
        );
        this.isSubmittingAuth = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  logout(): void {
    this.isLoggingOut = false;
    this.authStatus = 'unauthenticated';
    this.authMode = 'login';
    this.authCredentials = { username: '', password: '' };
    this.username = '';
    this.employees = null;
    this.authErrorMessage = '';
    this.authSuccessMessage = '';
    this.router.navigateByUrl('/login');
    this.changeDetector.markForCheck();
  }

  private getAuthErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const responseMessage =
        typeof error.error === 'object' &&
        error.error !== null &&
        'message' in error.error &&
        typeof error.error.message === 'string'
          ? error.error.message
          : '';
      return responseMessage || `${fallback} (HTTP ${error.status})`;
    }

    return fallback;
  }

  addEmployee(form: NgForm): void {
    if (form.invalid || this.isSubmittingEmployee) {
      return;
    }

    this.isSubmittingEmployee = true;
    this.employeeErrorMessage = '';
    this.employeeSuccessMessage = '';

    this.employeeService.addEmployee(this.employeeDetails).subscribe({
      next: () => {
        this.employeeSuccessMessage = 'Employee added successfully.';
        this.employeeDetails = { departmentID: 0, empId: 0, empName: '' };
        form.resetForm(this.employeeDetails);
        this.isSubmittingEmployee = false;
        this.loadEmployees(true);
      },
      error: (error: unknown) => {
        this.employeeErrorMessage =
          error instanceof HttpErrorResponse
            ? `Could not add employee: ${error.message}`
            : 'Could not add employee. Please try again.';
        this.isSubmittingEmployee = false;
      },
    });
  }

  loadEmployees(force = false): void {
    if (this.isLoadingEmployees && !force) {
      return;
    }

    const requestId = ++this.employeeLoadRequestId;
    this.isLoadingEmployees = true;
    this.employeesErrorMessage = '';

    this.employeeService.getAllEmployees().subscribe({
      next: (employees) => {
        if (requestId !== this.employeeLoadRequestId) {
          return;
        }

        this.employees = employees;
        this.isLoadingEmployees = false;
        this.employeeServiceUnavailable = false;
        this.employeesErrorMessage = '';
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        if (requestId !== this.employeeLoadRequestId) {
          return;
        }

        this.employeeServiceUnavailable =
          error instanceof HttpErrorResponse &&
          (error.status === 0 || error.status === 502 || error.status === 503 || error.status === 504);
        this.employeesErrorMessage = this.employeeServiceUnavailable
          ? 'The employee service is unavailable. Make sure the backend is running at http://localhost:8086, then try again.'
          : error instanceof HttpErrorResponse
            ? `Could not load employees (HTTP ${error.status}). Please try again.`
            : 'Could not load employees. Please try again.';
        this.isLoadingEmployees = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  startEmployeeEdit(employee: EmployeeDetails): void {
    this.editingEmployeeId = employee.empId;
    this.employeeEditDetails = { ...employee };
    this.employeeUpdateErrorMessage = '';
  }

  cancelEmployeeEdit(): void {
    if (this.isUpdatingEmployee) {
      return;
    }

    this.editingEmployeeId = null;
    this.employeeEditDetails = null;
    this.employeeUpdateErrorMessage = '';
  }

  updateEmployee(): void {
    if (!this.employeeEditDetails || this.isUpdatingEmployee) {
      return;
    }

    this.isUpdatingEmployee = true;
    this.employeeUpdateErrorMessage = '';

    this.employeeService.updateEmployee(this.employeeEditDetails).subscribe({
      next: () => {
        this.isUpdatingEmployee = false;
        this.editingEmployeeId = null;
        this.employeeEditDetails = null;
        this.employeeSuccessMessage = 'Employee updated successfully.';
        this.loadEmployees(true);
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        this.employeeUpdateErrorMessage =
          error instanceof HttpErrorResponse
            ? `Could not update employee: ${error.message}`
            : 'Could not update employee. Please try again.';
        this.isUpdatingEmployee = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  deleteEmployee(employee: EmployeeDetails): void {
    if (this.deletingEmployeeId !== null || this.isUpdatingEmployee) {
      return;
    }

    this.deletingEmployeeId = employee.empId;
    this.employeeDeleteErrorMessage = '';

    this.employeeService.deleteEmployee(employee.empId).subscribe({
      next: () => {
        this.employees =
          this.employees?.filter((item) => item.empId !== employee.empId) ?? [];
        if (this.editingEmployeeId === employee.empId) {
          this.editingEmployeeId = null;
          this.employeeEditDetails = null;
        }
        this.deletingEmployeeId = null;
        this.employeeSuccessMessage = 'Employee deleted successfully.';
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        this.employeeDeleteErrorMessage =
          error instanceof HttpErrorResponse
            ? `Could not delete employee: ${error.message}`
            : 'Could not delete employee. Please try again.';
        this.deletingEmployeeId = null;
        this.changeDetector.markForCheck();
      },
    });
  }

  addDepartment(form: NgForm): void {
    if (form.invalid || this.isSubmittingDepartment) {
      return;
    }

    this.isSubmittingDepartment = true;
    this.departmentErrorMessage = '';
    this.departmentSuccessMessage = '';

    this.departmentService.addDepartment(this.departmentDetails).subscribe({
      next: () => {
        this.departmentSuccessMessage = 'Department added successfully.';
        this.departmentDetails = { departmentID: 0, departmentName: '' };
        form.resetForm(this.departmentDetails);
        this.isSubmittingDepartment = false;
        this.loadDepartments(true);
      },
      error: (error: unknown) => {
        this.departmentErrorMessage =
          error instanceof HttpErrorResponse
            ? `Could not add department: ${error.message}`
            : 'Could not add department. Please try again.';
        this.isSubmittingDepartment = false;
      },
    });
  }

  addStudent(form: NgForm): void {
    if (form.invalid || this.isSubmittingStudent) {
      return;
    }

    this.isSubmittingStudent = true;
    this.studentErrorMessage = '';
    this.studentSuccessMessage = '';

    this.studentService.addStudent(this.studentDetails).subscribe({
      next: () => {
        this.studentSuccessMessage = 'Student added successfully.';
        this.studentDetails = { studentId: 0, studentName: '', departmentId: 0 };
        form.resetForm(this.studentDetails);
        this.isSubmittingStudent = false;
        this.loadStudents(true);
      },
      error: (error: unknown) => {
        this.studentErrorMessage =
          error instanceof HttpErrorResponse
            ? `Could not add student: ${error.message}`
            : 'Could not add student. Please try again.';
        this.isSubmittingStudent = false;
      },
    });
  }

  openDepartmentTab(): void {
    this.activeTab = 'department';
    this.loadDepartments();
  }

  loadDepartments(force = false): void {
    if (this.isLoadingDepartments && !force) {
      return;
    }

    const requestId = ++this.departmentLoadRequestId;
    this.isLoadingDepartments = true;
    this.departmentsErrorMessage = '';

    this.departmentService.getAllDepartments().subscribe({
      next: (departments) => {
        if (requestId !== this.departmentLoadRequestId) {
          return;
        }

        this.departments = departments;
        this.isLoadingDepartments = false;
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        if (requestId !== this.departmentLoadRequestId) {
          return;
        }

        this.departmentsErrorMessage =
          error instanceof HttpErrorResponse
            ? `Could not load departments: ${error.message}`
            : 'Could not load departments. Please try again.';
        this.isLoadingDepartments = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  openStudentTab(): void {
    this.activeTab = 'student';
    this.loadStudents();
  }

  loadStudents(force = false): void {
    if (this.isLoadingStudents && !force) {
      return;
    }

    const requestId = ++this.studentLoadRequestId;
    this.isLoadingStudents = true;
    this.studentsErrorMessage = '';

    this.studentService.getAllStudents().subscribe({
      next: (students) => {
        if (requestId !== this.studentLoadRequestId) {
          return;
        }

        this.students = students;
        this.isLoadingStudents = false;
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        if (requestId !== this.studentLoadRequestId) {
          return;
        }

        this.studentsErrorMessage =
          error instanceof HttpErrorResponse
            ? `Could not load students: ${error.message}`
            : 'Could not load students. Please try again.';
        this.isLoadingStudents = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  searchEmployee(form: NgForm): void {
    if (form.invalid || this.isSearchingEmployee || this.searchEmployeeId === null) {
      return;
    }

    this.isSearchingEmployee = true;
    this.employeeSearchResults = null;
    this.employeeSearchErrorMessage = '';

    this.employeeService.getEmployeeDetails(this.searchEmployeeId).subscribe({
      next: (results) => {
        this.employeeSearchResults = results;
        this.isSearchingEmployee = false;
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        this.employeeSearchErrorMessage =
          error instanceof HttpErrorResponse
            ? `Could not search employees: ${error.message}`
            : 'Could not search employees. Please try again.';
        this.isSearchingEmployee = false;
        this.changeDetector.markForCheck();
      },
    });
  }
}
