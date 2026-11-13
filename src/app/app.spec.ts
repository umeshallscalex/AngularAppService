import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NgForm } from '@angular/forms';
import { App } from './app';
import { routes } from './app.routes';

function initializeAuthenticatedApp(
  fixture: ComponentFixture<App>,
): TestRequest {
  fixture.detectChanges();

  const http = TestBed.inject(HttpTestingController);
  const sessionRequest = http.expectOne('/EmployeeService/api/auth/session');
  expect(sessionRequest.request.method).toBe('GET');
  sessionRequest.flush({ authenticated: true, username: 'test-user' });

  return http.expectOne('/EmployeeService/getEmpDetails');
}

function createAppFixture(): ComponentFixture<App> {
  const fixture = TestBed.createComponent(App);
  const request = initializeAuthenticatedApp(fixture);
  request.flush([]);
  fixture.detectChanges();
  return fixture;
}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routes),
      ],
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('should create the app', () => {
    const fixture = createAppFixture();
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = createAppFixture();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Manage records');
  });

  it('should register an account and return to the login form', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/EmployeeService/api/auth/session').flush({
      authenticated: false,
      username: null,
    });
    fixture.detectChanges();

    const app = fixture.componentInstance;
    app.setAuthMode('register');
    app.authCredentials = { username: 'new-user', password: 'password123' };
    app.submitAuth({ invalid: false } as NgForm);

    const request = http.expectOne('/EmployeeService/api/auth/register');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      username: 'new-user',
      password: 'password123',
    });
    expect(request.request.withCredentials).toBe(true);
    request.flush({ message: 'Account created.', username: 'new-user' });
    fixture.detectChanges();

    expect(app.authMode).toBe('login');
    expect(app.authSuccessMessage).toBe('Account created.');
  });

  it('should verify the session after login before opening home', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/EmployeeService/api/auth/session').flush({
      authenticated: false,
      username: null,
    });
    fixture.detectChanges();

    const app = fixture.componentInstance;
    app.authCredentials = { username: 'test-user', password: 'password123' };
    app.submitAuth({ invalid: false } as NgForm);

    const loginRequest = http.expectOne('/EmployeeService/api/auth/login');
    expect(loginRequest.request.method).toBe('POST');
    expect(loginRequest.request.body).toEqual({
      username: 'test-user',
      password: 'password123',
    });
    loginRequest.flush({ message: 'Login successful.' });
    const sessionRequest = http.expectOne('/EmployeeService/api/auth/session');
    expect(sessionRequest.request.method).toBe('GET');
    sessionRequest.flush({ authenticated: true, username: 'test-user' });
    const employeesRequest = http.expectOne('/EmployeeService/getEmpDetails');
    employeesRequest.flush([]);
    fixture.detectChanges();

    expect(app.authStatus).toBe('authenticated');
  });

  it('should return to login without making a logout request', () => {
    const fixture = TestBed.createComponent(App);
    initializeAuthenticatedApp(fixture).flush([]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.account-bar button')!.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.authStatus).toBe('unauthenticated');
    expect(element.querySelector('h1')?.textContent).toContain(
      'Welcome to BEC College Management System',
    );
    expect(element.querySelector('.text-button')?.textContent).toContain(
      'Create an account',
    );
    TestBed.inject(HttpTestingController).expectNone(
      '/EmployeeService/api/auth/logout',
    );
  });

  it('should show a helpful message and retry when employee service is unavailable', () => {
    const fixture = TestBed.createComponent(App);
    const request = initializeAuthenticatedApp(fixture);
    request.flush(
      { message: 'Bad Gateway' },
      { status: 502, statusText: 'Bad Gateway' },
    );
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Make sure the backend is running at http://localhost:8086',
    );
    expect(
      element.querySelector<HTMLButtonElement>('.retry-button')?.textContent,
    ).toContain('Retry');

    element.querySelector<HTMLButtonElement>('.retry-button')!.click();
    const retryRequest = TestBed.inject(HttpTestingController).expectOne(
      '/EmployeeService/getEmpDetails',
    );
    expect(retryRequest.request.method).toBe('GET');
    retryRequest.flush([]);
    fixture.detectChanges();

    expect(fixture.componentInstance.employeeServiceUnavailable).toBe(false);
    expect(element.querySelector('.retry-button')).toBeNull();
  });

  it('should post employee details and show success', async () => {
    const fixture = createAppFixture();
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    const values: Record<string, string> = {
      employeeDepartmentID: '1001',
      empId: '110',
      empName: 'Umesh',
    };

    for (const [name, value] of Object.entries(values)) {
      const input = element.querySelector<HTMLInputElement>(`#${name}`)!;
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    fixture.detectChanges();
    await fixture.whenStable();
    element.querySelector('form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );

    const request = TestBed.inject(HttpTestingController).expectOne(
      '/EmployeeService/addEmpDetails',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      departmentID: 1001,
      empId: 110,
      empName: 'Umesh',
    });

    request.flush({ message: 'Added' });
    fixture.detectChanges();
    expect(element.querySelector('[role="status"]')?.textContent).toContain(
      'Employee added successfully.',
    );

    const refreshedEmployeesRequest = TestBed.inject(
      HttpTestingController,
    ).expectOne('/EmployeeService/getEmpDetails');
    expect(refreshedEmployeesRequest.request.method).toBe('GET');
    refreshedEmployeesRequest.flush([
      { departmentID: 1000, empId: 100, empName: 'Umesh Kanchigidad' },
      { departmentID: 1000, empId: 1001, empName: 'Umesh K' },
      { departmentID: 1001, empId: 110, empName: 'Umesh' },
    ]);
    fixture.detectChanges();

    const employeeRows = Array.from(element.querySelectorAll('tbody tr')).map(
      (row) =>
        Array.from(row.querySelectorAll('td')).map((cell) =>
          cell.textContent?.trim(),
        ),
    );
    expect(employeeRows).toEqual([
      ['100', 'Umesh Kanchigidad', '1000', 'Modify  Remove'],
      ['1001', 'Umesh K', '1000', 'Modify  Remove'],
      ['110', 'Umesh', '1001', 'Modify  Remove'],
    ]);
  });

  it('should modify an employee with PUT and refresh the employee list', async () => {
    const fixture = TestBed.createComponent(App);
    const initialRequest = initializeAuthenticatedApp(fixture);
    initialRequest.flush([
      { departmentID: 1000, empId: 100, empName: 'Umesh Kanchigidad' },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.row-button')!.click();
    fixture.detectChanges();

    const nameInput = element.querySelector<HTMLInputElement>(
      '#employee-name-edit-100',
    )!;
    nameInput.value = 'Umesh K';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));

    const departmentInput = element.querySelector<HTMLInputElement>(
      '#employee-department-edit-100',
    )!;
    departmentInput.value = '1001';
    departmentInput.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    const saveButton = Array.from(
      element.querySelectorAll<HTMLButtonElement>('.row-button'),
    ).find((button) => button.textContent?.trim() === 'Save')!;
    saveButton.click();

    const updateRequest = TestBed.inject(HttpTestingController).expectOne(
      '/EmployeeService/updateEmpDetails',
    );
    expect(updateRequest.request.method).toBe('PUT');
    expect(updateRequest.request.body).toEqual({
      departmentID: 1001,
      empId: 100,
      empName: 'Umesh K',
    });
    updateRequest.flush({ message: 'Updated' });

    const refreshRequest = TestBed.inject(HttpTestingController).expectOne(
      '/EmployeeService/getEmpDetails',
    );
    expect(refreshRequest.request.method).toBe('GET');
    refreshRequest.flush([
      { departmentID: 1001, empId: 100, empName: 'Umesh K' },
    ]);

    fixture.detectChanges();
    expect(element.querySelector('[role="status"]')?.textContent).toContain(
      'Employee updated successfully.',
    );
    expect(
      Array.from(element.querySelectorAll('tbody tr td')).map((cell) =>
        cell.textContent?.trim(),
      ),
    ).toEqual(['100', 'Umesh K', '1001', 'Modify  Remove']);
  });

  it('should delete an employee and immediately remove its row', async () => {
    const fixture = TestBed.createComponent(App);
    const initialRequest = initializeAuthenticatedApp(fixture);
    initialRequest.flush([
      { departmentID: 1000, empId: 100, empName: 'Umesh' },
      { departmentID: 1001, empId: 101, empName: 'Aishwarya' },
    ]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const removeButton = Array.from(
      element.querySelectorAll<HTMLButtonElement>('.row-button.danger'),
    ).find((button) => button.closest('tr')?.textContent?.includes('Umesh'))!;
    removeButton.click();
    fixture.detectChanges();
    expect(removeButton.textContent?.trim()).toBe('Removing…');

    const deleteRequest = TestBed.inject(HttpTestingController).expectOne(
      '/EmployeeService/deleteEmpDetails/100',
    );
    expect(deleteRequest.request.method).toBe('DELETE');
    deleteRequest.flush(null);

    fixture.detectChanges();
    expect(
      Array.from(element.querySelectorAll('tbody tr')).map((row) =>
        row.textContent?.replace(/\s+/g, ' ').trim(),
      ),
    ).toEqual(['101Aishwarya1001 Modify Remove']);
    expect(element.querySelector('[role="status"]')?.textContent).toContain(
      'Employee deleted successfully.',
    );
  });

  it('should post department details and show success', async () => {
    const fixture = createAppFixture();
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    element.querySelectorAll<HTMLButtonElement>('.tab')[2].click();
    fixture.detectChanges();
    await fixture.whenStable();

    const initialDepartmentsRequest = TestBed.inject(HttpTestingController).expectOne(
      '/EmployeeService/departments/all',
    );
    expect(initialDepartmentsRequest.request.method).toBe('GET');
    initialDepartmentsRequest.flush([{ departmentID: 1000, departmentName: 'CSE' }]);
    fixture.detectChanges();

    for (const [name, value] of Object.entries({
      departmentID: '1001',
      departmentName: 'MCA',
    })) {
      const input = element.querySelector<HTMLInputElement>(`#${name}`)!;
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    fixture.detectChanges();
    await fixture.whenStable();
    element.querySelector('form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );

    const request = TestBed.inject(HttpTestingController).expectOne(
      '/EmployeeService/departments/add',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      departmentID: 1001,
      departmentName: 'MCA',
    });

    request.flush({ message: 'Added' });
    fixture.detectChanges();
    expect(element.querySelector('[role="status"]')?.textContent).toContain(
      'Department added successfully.',
    );

    const refreshedDepartmentsRequest = TestBed.inject(
      HttpTestingController,
    ).expectOne('/EmployeeService/departments/all');
    expect(refreshedDepartmentsRequest.request.method).toBe('GET');
    refreshedDepartmentsRequest.flush([
      { departmentID: 1000, departmentName: 'CSE' },
      { departmentID: 1001, departmentName: 'MCA' },
    ]);
    fixture.detectChanges();

    const departmentRows = Array.from(element.querySelectorAll('tbody tr')).map(
      (row) =>
        Array.from(row.querySelectorAll('td')).map((cell) =>
          cell.textContent?.trim(),
        ),
    );
    expect(departmentRows).toEqual([
      ['1000', 'CSE'],
      ['1001', 'MCA'],
    ]);
  });

  it('should post student details and show success', async () => {
    const fixture = createAppFixture();
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    element.querySelectorAll<HTMLButtonElement>('.tab')[3].click();
    fixture.detectChanges();
    await fixture.whenStable();

    const initialStudentsRequest = TestBed.inject(HttpTestingController).expectOne(
      '/EmployeeService/students/all',
    );
    expect(initialStudentsRequest.request.method).toBe('GET');
    initialStudentsRequest.flush([
      { departmentId: 1000, studentId: 100, studentName: 'Aishwarya' },
      { departmentId: 100, studentId: 10001, studentName: 'U' },
    ]);
    fixture.detectChanges();

    for (const [name, value] of Object.entries({
      studentId: '2002',
      studentName: 'Aishwarya',
      studentDepartmentId: '1001',
    })) {
      const input = element.querySelector<HTMLInputElement>(`#${name}`)!;
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    fixture.detectChanges();
    await fixture.whenStable();
    element.querySelector('form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );

    const request = TestBed.inject(HttpTestingController).expectOne(
      '/EmployeeService/students/add',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      studentId: 2002,
      studentName: 'Aishwarya',
      departmentId: 1001,
    });

    request.flush({ message: 'Added' });
    fixture.detectChanges();
    expect(element.querySelector('[role="status"]')?.textContent).toContain(
      'Student added successfully.',
    );

    const refreshedStudentsRequest = TestBed.inject(HttpTestingController).expectOne(
      '/EmployeeService/students/all',
    );
    expect(refreshedStudentsRequest.request.method).toBe('GET');
    refreshedStudentsRequest.flush([
      { departmentId: 1000, studentId: 100, studentName: 'Aishwarya' },
      { departmentId: 100, studentId: 10001, studentName: 'U' },
      { departmentId: 1001, studentId: 2002, studentName: 'Aishwarya' },
    ]);
    fixture.detectChanges();

    const studentRows = Array.from(element.querySelectorAll('tbody tr')).map(
      (row) =>
        Array.from(row.querySelectorAll('td')).map((cell) =>
          cell.textContent?.trim(),
        ),
    );
    expect(studentRows).toEqual([
      ['100', 'Aishwarya', '1000'],
      ['10001', 'U', '100'],
      ['2002', 'Aishwarya', '1001'],
    ]);
  });

  it('should fetch and display employee details by ID', async () => {
    const fixture = createAppFixture();
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    element.querySelectorAll<HTMLButtonElement>('.tab')[0].click();
    fixture.detectChanges();
    await fixture.whenStable();

    const input = element.querySelector<HTMLInputElement>('#searchEmployeeId')!;
    input.value = '110';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    element.querySelector('form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );

    const request = TestBed.inject(HttpTestingController).expectOne(
      '/EmployeeService/departments/detailsEmp/110',
    );
    expect(request.request.method).toBe('GET');
    request.flush([
      {
        empId: 1001,
        departmentName: 'CSE',
        studentId: 100,
        studentName: 'Aishwarya',
        departmentId: 1000,
      },
    ]);

    fixture.detectChanges();
    expect(fixture.componentInstance.isSearchingEmployee).toBe(false);
    const resultRow = element.querySelector('tbody tr');
    expect(
      Array.from(resultRow?.querySelectorAll('td') ?? []).map((cell) =>
        cell.textContent?.trim(),
      ),
    ).toEqual(['1001', 'CSE', '100', 'Aishwarya', '1000']);
  });
});
