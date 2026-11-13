import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface EmployeeDetails {
  departmentID: number;
  empId: number;
  empName: string;
}

export interface EmployeeSearchResult {
  empId: number;
  departmentName: string;
  studentId: number;
  studentName: string;
  departmentId: number;
}

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  constructor(private readonly http: HttpClient) {}

  addEmployee(details: EmployeeDetails): Observable<unknown> {
    return this.http.post<unknown>('/EmployeeService/addEmpDetails', details);
  }

  updateEmployee(details: EmployeeDetails): Observable<unknown> {
    return this.http.put<unknown>('/EmployeeService/updateEmpDetails', details);
  }

  deleteEmployee(employeeId: number): Observable<unknown> {
    return this.http.delete<unknown>(
      `/EmployeeService/deleteEmpDetails/${encodeURIComponent(employeeId)}`,
    );
  }

  getAllEmployees(): Observable<EmployeeDetails[]> {
    return this.http.get<EmployeeDetails[]>('/EmployeeService/getEmpDetails');
  }

  getEmployeeDetails(employeeId: number): Observable<EmployeeSearchResult[]> {
    return this.http.get<EmployeeSearchResult[]>(
      `/EmployeeService/departments/detailsEmp/${encodeURIComponent(employeeId)}`,
    );
  }
}
