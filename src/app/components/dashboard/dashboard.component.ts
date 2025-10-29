// components/dashboard/dashboard.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { AppointmentService } from '../../services/appointment.service';
import { UserService } from '../../services/user.service';
import { HttpClient } from '@angular/common/http';
import { User } from '../../interfaces/user.interface';
import { Appointment } from '../../interfaces/appointment.interface';
import { formatDate } from '@angular/common';
import { SlicePipe } from '@angular/common';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  standalone: false,
})
export class DashboardComponent implements OnInit, OnDestroy {
  // Clock
  timeString: string = '';
  dateString: string = '';
  private _clockInterval: any = null;
  // Clock format preference: true = 24h, false = 12h
  use24Hour: boolean = true;

  currentUser: User | null = null;
  todayAppointments: Appointment[] = [];
  upcomingAppointments: Appointment[] = [];
  stats: any = {
    totalAppointments: 0,
    pendingAppointments: 0,
    confirmedAppointments: 0
  };
  loading = true;
  // Admin metrics
  adminMetrics: {
    totalUsers: number;
    totalPatients: number;
    totalDoctors: number;
    totalSecretaries: number;
    totalAdmins: number;
    totalAppointments: number;
    totalSpecialties: number;
    totalActiveUsers?: number;
    totalInactiveUsers?: number;
  } = {
    totalUsers: 0,
    totalPatients: 0,
    totalDoctors: 0,
    totalSecretaries: 0,
    totalAdmins: 0,
    totalAppointments: 0,
    totalSpecialties: 0,
    totalActiveUsers: 0,
    totalInactiveUsers: 0,
  };

  constructor(
    private authService: AuthService,
    private appointmentService: AppointmentService,
    private userService: UserService
    , private http: HttpClient
  ) {
    this.currentUser = this.authService.currentUserValue;
  }

  ngOnInit(): void {
    // Cargar preferencia de formato de reloj antes de iniciar
    this.loadClockPreference();
    // Inicializar reloj de bienvenida siempre
    this.startClock();
    if(this.currentUser){
      this.loadDashboardData();
    } else {
      console.error('No hay usuario autenticado');
      this.loading = false;
    }
  }

  // Chart references
  private appointmentsWeekChart: any = null;
  private newUsersChart: any = null;
  private deactivatedUsersChart: any = null;
  // Alternar para habilitar/deshabilitar el renderizado de gráficos (poner false para evitar cargas pesadas durante la depuración)
  adminChartsEnabled = false;
  // UI flag while charts are being prepared
  renderingCharts = false;

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

  // Load and persist clock format preference per user (localStorage)
  private clockPrefKey(): string {
    const id = this.currentUser ? this.currentUser.id : 'guest';
    return `clockFormat:${id}`;
  }

  private loadClockPreference(): void {
    try {
      const v = this.currentUser ? localStorage.getItem(this.clockPrefKey()) : localStorage.getItem('clockFormat:guest');
      if (v === '24') this.use24Hour = true;
      else if (v === '12') this.use24Hour = false;
      else this.use24Hour = true; // default 24h
    } catch (e) {
      this.use24Hour = true;
    }
  }

  toggleClockFormat(): void {
    this.use24Hour = !this.use24Hour;
    try {
      localStorage.setItem(this.clockPrefKey(), this.use24Hour ? '24' : '12');
    } catch (e) {
      console.warn('No se pudo guardar la preferencia de reloj en localStorage', e);
    }
    // Force immediate update
    const now = new Date();
    this.timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: !this.use24Hour });
    // Persist preference in backend if user is logged
    if (this.currentUser && this.currentUser.id) {
      const payload: any = { clockFormat: this.use24Hour ? '24' : '12' };
  this.http.put(`/api/users/${this.currentUser.id}/preferences`, payload).subscribe({
        next: () => console.log('Clock preference saved to server'),
        error: (e) => console.warn('Could not save clock preference to server', e)
      });
    }
  }

  loadDashboardData(): void {
    if (!this.currentUser) return;
    this.loading = true;
    
    // Cargar citas según el tipo de usuario
    if (this.currentUser.tipo === 'paciente') {
      this.loadPatientDashboard();
    } else if (this.currentUser.tipo === 'doctor') {
      this.loadDoctorDashboard();
    } else {
      this.loadAdminDashboard();
    }
  }

  loadPatientDashboard(): void {
    if (!this.currentUser) return;
    this.appointmentService.getAppointmentsByUser(this.currentUser.id).subscribe({
      next: (response: Appointment[] | { appointments: Appointment[] }) => {
        // Ajuste: acceder al array correcto
        const appointments = Array.isArray(response) ? response : (response as { appointments: Appointment[] }).appointments || [];
        this.processAppointments(appointments);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading appointments:', error);
        this.loading = true;
      }
    });
  }

  loadDoctorDashboard(): void {
    // Implementar lógica para doctor
    this.loading = false;
  }

  loadAdminDashboard(): void {
    // Cargar métricas para administrador
    this.loading = true;

    // Usuarios (obtener página 1 con límite grande para contar)
    this.userService.getAllUsers().subscribe({
      next: (resp: any) => {
        const dataArray = resp && resp.data ? resp.data : [];
        this.adminMetrics.totalUsers = resp && typeof resp.total === 'number' ? resp.total : dataArray.length;
        // contar por tipo si la respuesta incluye tipo
        this.adminMetrics.totalPatients = dataArray.filter((u: any) => u.tipo === 'paciente').length;
        this.adminMetrics.totalDoctors = dataArray.filter((u: any) => u.tipo === 'doctor').length;
        this.adminMetrics.totalSecretaries = dataArray.filter((u: any) => u.tipo === 'secretaria').length;
        this.adminMetrics.totalAdmins = dataArray.filter((u: any) => u.tipo === 'administrador').length;
        // Active / inactive (may be in 'activo' or 'Estado')
        this.adminMetrics.totalActiveUsers = dataArray.filter((u: any) => u.activo === true || (u.Estado && (u.Estado === 'Si' || u.Estado === 'SI'))).length;
        this.adminMetrics.totalInactiveUsers = this.adminMetrics.totalUsers - (this.adminMetrics.totalActiveUsers || 0);
      },
      error: (err) => {
        console.error('Error loading users for admin dashboard', err);
      }
    });

    // Citas (usar métricas agregadas del backend)
  this.http.get<any>('/api/metrics/appointments/week').subscribe({
      next: (resp) => {
        // resp: { labels: [dateStr..], data: [counts..] }
        if (resp && Array.isArray(resp.data)) {
          this.adminMetrics.totalAppointments = resp.data.reduce((s: number, v: number) => s + v, 0);
        }
        if (this.adminChartsEnabled) {
          setTimeout(() => this.renderAppointmentsWeekChart(resp.labels || [], resp.data || []), 200);
        }
      },
      error: (err) => console.error('Error loading appointment metrics', err)
    });

    // Especialidades
    this.appointmentService.getSpecialties().subscribe({
      next: (spec: any) => {
        // respuesta puede venir como { specialties: [...] } o como array
        const arr = Array.isArray(spec) ? spec : (spec && spec.specialties ? spec.specialties : []);
        this.adminMetrics.totalSpecialties = arr.length;
      },
      error: (err) => {
        console.error('Error loading specialties', err);
      },
      complete: () => {
        this.loading = false;
        // Prepare user charts: new users / deactivated users in month
        this.prepareUserMonthlyCharts();
      }
    });
  }

  private computeAppointmentsThisWeek(citas: any[]): { labels: string[], data: number[] } {
    // Get current week's Monday..Sunday
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = (day + 6) % 7; // 0->Mon
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    monday.setHours(0,0,0,0);

    const labels: string[] = [];
    const data: number[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      labels.push(d.toLocaleDateString(undefined, { weekday: 'short' }));
      const dayStr = d.toISOString().split('T')[0];
      // iterate to count (avoid creating intermediate arrays)
      let count = 0;
      for (let j = 0; j < citas.length; j++) {
        const c = citas[j];
        if (c && c.fecha === dayStr) count++;
      }
      data.push(count);
    }
    return { labels, data };
  }

  private prepareUserMonthlyCharts(): void {
    // fetch all users and compute creation/deactivation dates if available
    this.userService.getAllUsers().subscribe({
      next: (resp: any) => {
        const users = resp && resp.data ? resp.data : [];
        // sample large user arrays to avoid heavy blocking
        const safeUsers = this.sampleArray(users, 3000);
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();

        // build days array for the current month
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const labels = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
        const newUsersPerDay = new Array(daysInMonth).fill(0);
        const deactivatedPerDay = new Array(daysInMonth).fill(0);

        safeUsers.forEach((u: any) => {
          // Assume user may have fechaCreacion or createdAt and fechaBaja or deactivatedAt fields
          const created = u.fechaCreacion || u.createdAt || u.created_at;
          const deactivated = u.fechaBaja || u.deactivatedAt || u.deletedAt || u.fechaInactivo;
          if (created) {
            const d = new Date(created);
            if (d.getFullYear() === year && d.getMonth() === month) {
              newUsersPerDay[d.getDate() - 1]++;
            }
          }
          if (deactivated) {
            const d = new Date(deactivated);
            if (d.getFullYear() === year && d.getMonth() === month) {
              deactivatedPerDay[d.getDate() - 1]++;
            }
          }
        });

        if (this.adminChartsEnabled) {
          setTimeout(() => this.renderNewUsersChart(labels, newUsersPerDay), 200);
          setTimeout(() => this.renderDeactivatedUsersChart(labels, deactivatedPerDay), 200);
        } else {
          console.log('Admin charts disabled, skipping monthly user charts render');
        }
      },
      error: (err) => {
        console.error('Error preparando datos de usuarios mensuales', err);
      }
    });
  }

  // Utility: if array is larger than maxLen, returns a sampled subset (every nth item)
  private sampleArray<T>(arr: T[], maxLen: number): T[] {
    if (!arr || arr.length <= maxLen) return arr || [];
    const step = Math.ceil(arr.length / maxLen);
    const out: T[] = [];
    for (let i = 0; i < arr.length; i += step) out.push(arr[i]);
    return out;
  }

  private renderAppointmentsWeekChart(labels: string[], data: number[]): void {
    try {
      this.drawBarChartSVG('appointmentsWeekChart', labels, data, '#4CAF50');
    } catch (e) {
      console.error('Error drawing SVG bar chart', e);
    }
  }

  private renderNewUsersChart(labels: string[], data: number[]): void {
    try {
      this.drawLineChartSVG('newUsersMonthChart', labels, data, '#2196F3');
    } catch (e) {
      console.error('Error drawing SVG line chart', e);
    }
  }

  private renderDeactivatedUsersChart(labels: string[], data: number[]): void {
    try {
      this.drawLineChartSVG('deactivatedUsersMonthChart', labels, data, '#F44336');
    } catch (e) {
      console.error('Error drawing SVG line chart', e);
    }
  }

  // Lightweight SVG bar chart
  private drawBarChartSVG(containerId: string, labels: string[], data: number[], color: string) {
    console.time(`drawBar:${containerId}`);
    const container = document.getElementById(containerId);
    if (!container) return;
    // Clear
    container.innerHTML = '';
    const width = container.clientWidth || 600;
    const height = 240;
    const max = Math.max(1, ...data);
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    const padding = 32;
    const barWidth = (width - padding * 2) / Math.max(1, labels.length);
    for (let i = 0; i < labels.length; i++) {
      const val = data[i] || 0;
      const h = (val / max) * (height - padding * 2);
      const x = padding + i * barWidth + 6;
      const y = height - padding - h;
      const rect = document.createElementNS(svgNS, 'rect');
      rect.setAttribute('x', String(x));
      rect.setAttribute('y', String(y));
      rect.setAttribute('width', String(Math.max(4, barWidth - 12)));
      rect.setAttribute('height', String(h));
      rect.setAttribute('fill', color);
      svg.appendChild(rect);
      const tx = document.createElementNS(svgNS, 'text');
      tx.setAttribute('x', String(x + 4));
      tx.setAttribute('y', String(height - padding + 14));
      tx.setAttribute('fill', '#2e2e2e');
      tx.setAttribute('font-size', '10');
      tx.textContent = labels[i].slice(-2); // short label
      svg.appendChild(tx);
    }
    container.appendChild(svg);
    console.timeEnd(`drawBar:${containerId}`);
  }

  // Lightweight SVG line chart
  private drawLineChartSVG(containerId: string, labels: string[], data: number[], color: string) {
    console.time(`drawLine:${containerId}`);
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    const width = container.clientWidth || 600;
    const height = 240;
  // If the series is long, sample it to a max number of points to avoid heavy DOM work
  const MAX_POINTS = 30;
    let sampledLabels = labels;
    let sampledData = data;
    if (labels.length > MAX_POINTS) {
      const step = Math.ceil(labels.length / MAX_POINTS);
      sampledLabels = [];
      sampledData = [];
      for (let i = 0; i < labels.length; i += step) {
        sampledLabels.push(labels[i]);
        sampledData.push(data[i] || 0);
      }
    }
    const max = Math.max(1, ...sampledData);
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    const padding = 32;
    const stepX = (width - padding * 2) / Math.max(1, sampledLabels.length - 1);
    let path = '';
    for (let i = 0; i < sampledLabels.length; i++) {
      const val = sampledData[i] || 0;
      const x = padding + i * stepX;
      const y = height - padding - (val / max) * (height - padding * 2);
      if (i === 0) path += `M ${x} ${y}`;
      else path += ` L ${x} ${y}`;
      // Avoid creating a DOM node per point (circles) to reduce layout cost.
      // We only draw the path; interactive points can be added later on hover if needed.
    }
    const p = document.createElementNS(svgNS, 'path');
    p.setAttribute('d', path);
    p.setAttribute('stroke', color);
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke-width', '2');
    svg.appendChild(p);
    container.appendChild(svg);
    console.timeEnd(`drawLine:${containerId}`);
  }

  renderAdminCharts(): void {
    if (!this.currentUser || this.currentUser.tipo !== 'administrador') return;
    this.adminChartsEnabled = true;
    this.renderingCharts = true;
    // We'll fetch the three metric endpoints, then render them one by one with small delays
    // to avoid a large single blocking operation. Also add console timings to trace where
    // time is spent (network vs. rendering).
    console.time('renderAdminCharts');

  console.time('net:appointments');
  const fetchAppointments = this.http.get<any>('/api/metrics/appointments/week').toPromise().then(r => { console.timeEnd('net:appointments'); return r; }).catch(e => { console.timeEnd('net:appointments'); throw e; });
  console.time('net:newUsers');
  const fetchNewUsers = this.http.get<any>('/api/metrics/users/new/month').toPromise().then(r => { console.timeEnd('net:newUsers'); return r; }).catch(e => { console.timeEnd('net:newUsers'); throw e; });
  console.time('net:deactivated');
  const fetchDeactivated = this.http.get<any>('/api/metrics/users/deactivated/month').toPromise().then(r => { console.timeEnd('net:deactivated'); return r; }).catch(e => { console.timeEnd('net:deactivated'); throw e; });

    Promise.allSettled([fetchAppointments, fetchNewUsers, fetchDeactivated]).then((results) => {
      // results: [appointments, newUsers, deactivated]
      const appt = results[0].status === 'fulfilled' ? (results[0] as PromiseFulfilledResult<any>).value : null;
      const newU = results[1].status === 'fulfilled' ? (results[1] as PromiseFulfilledResult<any>).value : null;
      const deact = results[2].status === 'fulfilled' ? (results[2] as PromiseFulfilledResult<any>).value : null;

      // Stagger renders to keep UI responsive
      const renders: Array<() => void> = [];
      if (appt) renders.push(() => { console.time('render:appointments'); this.renderAppointmentsWeekChart(appt.labels || [], appt.data || []); console.timeEnd('render:appointments'); });
      if (newU) renders.push(() => { console.time('render:newUsers'); this.renderNewUsersChart(newU.labels || [], newU.data || []); console.timeEnd('render:newUsers'); });
      if (deact) renders.push(() => { console.time('render:deactivated'); this.renderDeactivatedUsersChart(deact.labels || [], deact.data || []); console.timeEnd('render:deactivated'); });

      const scheduleNext = (i: number) => {
        if (i >= renders.length) {
          this.renderingCharts = false;
          console.timeEnd('renderAdminCharts');
          return;
        }
        const fn = renders[i];
        // Use requestIdleCallback when available to do rendering off peak
        const ric = (window as any).requestIdleCallback || ((cb: any) => (window.requestAnimationFrame ? window.requestAnimationFrame(cb) : setTimeout(cb, 0)));
        ric(() => {
          try { fn(); } catch (e) { console.error('Error during staged render', e); }
          // very small gap between renders to minimize total latency but still yield briefly
          setTimeout(() => scheduleNext(i + 1), 8);
        });
      };
      // start
      scheduleNext(0);
    }).catch((err) => {
      console.error('Unexpected error fetching metrics', err);
      this.renderingCharts = false;
      console.timeEnd('renderAdminCharts');
    });
  }

  processAppointments(appointments: Appointment[]): void {
    const today = new Date().toISOString().split('T')[0];
    const isConfirmed = (val: any) => {
      if (val === undefined || val === null) return false;
      const s = String(val).toLowerCase();
      return s === 'si' || s === 'sí' || s === 'true' || s === '1';
    };
    const isPending = (val: any) => {
      if (val === undefined || val === null) return false;
      const s = String(val).toLowerCase();
      return s === 'no' || s === 'false' || s === '0';
    };

    // Today: any appointment with fecha === today and considered confirmed
    this.todayAppointments = appointments.filter(apt => apt && apt.fecha === today && isConfirmed(apt.confirmado));

    // Upcoming: fecha > today, limit 5
    this.upcomingAppointments = appointments.filter(apt => apt && apt.fecha > today).sort((a,b) => (a.fecha > b.fecha ? 1 : -1)).slice(0, 5);

    this.stats.totalAppointments = appointments.length;
    this.stats.pendingAppointments = appointments.filter(apt => apt && isPending(apt.confirmado)).length;
    this.stats.confirmedAppointments = appointments.filter(apt => apt && isConfirmed(apt.confirmado)).length;
  }

  logout(): void {
    this.authService.logout();
  }
}