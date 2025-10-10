import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService, ApiResponse } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class MessageEnvelopeService {
  private envelopesSubject = new BehaviorSubject<any[]>([]);
  public envelopes$: Observable<any[]> = this.envelopesSubject.asObservable();

  constructor(private apiService: ApiService) { }

  loadEnvelopes() {
    return this.apiService.getMessageEnvelopes().pipe(
      tap(response => {
        if (response.success && response.data) {
          this.envelopesSubject.next(response.data);
        }
      })
    );
  }

  createMessageEnvelope(data: any): Observable<ApiResponse<any>> {
    return this.apiService.createMessageEnvelope(data).pipe(
      tap(() => {
        this.loadEnvelopes().subscribe();
      })
    );
  }

  updateMessageEnvelope(id: string, data: any): Observable<ApiResponse<any>> {
    return this.apiService.updateMessageEnvelope(id, data).pipe(
      tap(() => {
        this.loadEnvelopes().subscribe();
      })
    );
  }

  deleteMessageEnvelope(id: string): Observable<ApiResponse<any>> {
    return this.apiService.deleteMessageEnvelope(id).pipe(
      tap(() => {
        this.loadEnvelopes().subscribe();
      })
    );
  }
}
