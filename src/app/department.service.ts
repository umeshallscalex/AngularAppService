import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface DepartmentDetails {
  departmentID: number;
  departmentName: string;
}

@Injectable({ providedIn: 'root' })
export class DepartmentService {
  constructor(private readonly http: HttpClient) {}

  addDepartment(details: DepartmentDetails): Observable<unknown> {
    return this.http.post<unknown>('/EmployeeService/departments/add', details);
  }

  getAllDepartments(): Observable<DepartmentDetails[]> {
    return this.http.get<DepartmentDetails[]>('/EmployeeService/departments/all');
  }
}
