import { isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly title = signal('clinic-route');

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return; // <-- evita SSR

    // Bloquea retroceso REAL
    history.pushState(null, '', location.href);
    window.addEventListener('popstate', () => {
      history.pushState(null, '', location.href);
    });

    // Evita BackForwardCache (iOS + Android)
    window.addEventListener('pageshow', (event: PageTransitionEvent) => {
      if ((event as any).persisted) {
        location.reload();
      }
    });
  }
}
