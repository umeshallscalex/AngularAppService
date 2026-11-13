import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface AuthCredentials {
  username: string;
  password: string;
}

export interface AuthSession {
  authenticated: boolean;
  username: string | null;
}

export interface AuthResponse {
  message: string;
  username?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = '/EmployeeService/api/auth';

  constructor(private readonly http: HttpClient) {}

  register(credentials: AuthCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/register`, credentials, {
      withCredentials: true,
    });
  }

  login(credentials: AuthCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, credentials, {
      withCredentials: true,
    });
  }

  getSession(): Observable<AuthSession> {
    return this.http.get<AuthSession>(`${this.baseUrl}/session`, {
      withCredentials: true,
    });
  }

}
