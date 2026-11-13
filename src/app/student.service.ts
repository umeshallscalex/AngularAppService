import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface StudentDetails {
  studentId: number;
  studentName: string;
  departmentId: number;
}

export interface StudentRecord {
  departmentId: number;
  studentId: number;
  studentName: string;
}

@Injectable({ providedIn: 'root' })
export class StudentService {
  constructor(private readonly http: HttpClient) {}

  addStudent(details: StudentDetails): Observable<unknown> {
    return this.http.post<unknown>('/EmployeeService/students/add', details);
  }

  getAllStudents(): Observable<StudentRecord[]> {
    return this.http.get<StudentRecord[]>('/EmployeeService/students/all');
  }
}
