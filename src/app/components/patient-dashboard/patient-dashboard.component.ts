import { Component, Input, OnInit, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Appointment } from '../../interfaces/appointment.interface';
import { AuthService } from '../../services/auth.service';
import { AppointmentService } from '../../services/appointment.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './patient-dashboard.component.html',
  styleUrls: ['./patient-dashboard.component.css']
})
export class PatientDashboardComponent implements OnInit, OnDestroy {
  @Input() timeString: string = '';
  @Input() dateString: string = '';
  @Input() use24Hour: boolean = true;
  // Appointments removed from patient view; dashboard still keeps data if needed
  @Output() toggleClock: EventEmitter<void> = new EventEmitter();

  private _clockInterval: any = null;
  currentUser: any = null;
  missionText: string = '';
  visionText: string = '';

  constructor(
    private authService: AuthService,
    private appointmentService: AppointmentService
    , private http: HttpClient
  ) {}

  ngOnInit(): void {
    // load user
    this.currentUser = this.authService.currentUserValue;
    this.loadClockPreference();
    this.startClock();
    // Fetch mission & vision from settings so admin can edit them
    this.loadMissionVision();
  }

  ngOnDestroy(): void {
    if (this._clockInterval) {
      clearInterval(this._clockInterval);
      this._clockInterval = null;
    }
  }

  private startClock(): void {
    const update = () => {
      const now = new Date();
      this.timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: !this.use24Hour });
      this.dateString = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };
    update();
    this._clockInterval = setInterval(update, 1000);
  }

  private clockPrefKey(): string {
    const id = this.currentUser ? this.currentUser.id : 'guest';
    return `clockFormat:${id}`;
  }

  private loadClockPreference(): void {
    try {
      const v = this.currentUser ? localStorage.getItem(this.clockPrefKey()) : localStorage.getItem('clockFormat:guest');
      if (v === '24') this.use24Hour = true;
      else if (v === '12') this.use24Hour = false;
      else this.use24Hour = true;
    } catch (e) {
      this.use24Hour = true;
    }
  }

  toggleClockFormat() {
    this.use24Hour = !this.use24Hour;
    try { localStorage.setItem(this.clockPrefKey(), this.use24Hour ? '24' : '12'); } catch(e){}
    // persist to server optionally
    if (this.currentUser && this.currentUser.id) {
      // best effort non-blocking
      try {
        // AppointmentService doesn't expose preferences; use AuthService/http externally if needed
      } catch (e) {}
    }
  }

  // Appointment-related UI removed for patient; keep service available for future actions

  private loadMissionVision(): void {
    // mission
    try {
      this.http.get<any>('/api/settings/mission').subscribe({
        next: (r: any) => { this.missionText = r && r.value ? r.value : ''; },
        error: (e: any) => { console.error('Error loading mission for patient dashboard', e); this.missionText = ''; }
      });
    } catch (e) { console.warn(e); }

    // vision
    try {
      this.http.get<any>('/api/settings/vision').subscribe({
        next: (r: any) => { this.visionText = r && r.value ? r.value : ''; },
        error: (e: any) => { console.error('Error loading vision for patient dashboard', e); this.visionText = ''; }
      });
    } catch (e) { console.warn(e); }
  }
}
