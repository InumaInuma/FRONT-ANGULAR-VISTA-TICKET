import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  Output,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import { SiglaService } from '../../core/services/sigla';
import { ServiciosExamenes } from '../../core/services/servicios-examenes';

@Component({
  selector: 'app-signature-pad',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './signature-pad.html',
  styleUrl: './signature-pad.scss',
})
export class SignaturePad {
  constructor(
  private siglaservice: SiglaService,
  private servicioExamenes : ServiciosExamenes
  ) {}
  // ======= Firma (canvas) =======
  @ViewChild('sigCanvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  // ✅ Emite base64 (string) cuando termina de dibujar; o null cuando se limpia
  @Output() onChange = new EventEmitter<string | null>(); // ahora emite base64 o null

  // ======= Huella (UI) =======
  /** URL (del backend) para mostrar la huella. La crea el padre. */
  @Input() huellaUrl: string | null = null;
  /** Estado del checkbox (lo controla el padre). */
  @Input() mostrarHuella = false;
  /** Notifica al padre cuando el usuario marca/desmarca el checkbox. */
  @Output() huellaChange = new EventEmitter<boolean>();

  private platformId = inject(PLATFORM_ID);
  private ctx!: CanvasRenderingContext2D;
  private drawing = false;
  private hasStrokes = false;
  private lastX = 0;
  private lastY = 0;

  private get isBrowser() {
    return isPlatformBrowser(this.platformId);
  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!this.isBrowser) return;

    const canvas = this.canvasRef.nativeElement;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    this.ctx = canvas.getContext('2d')!;
    this.ctx.scale(dpr, dpr);
    this.ctx.lineWidth = 2;
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';
    this.ctx.strokeStyle = '#111827';

    // Mouse
    canvas.addEventListener('mousedown', this.startDraw);
    canvas.addEventListener('mousemove', this.draw);
    window.addEventListener('mouseup', this.endDraw);

    // Touch
    canvas.addEventListener('touchstart', this.startDrawTouch as any, {
      passive: false,
    });
    canvas.addEventListener('touchmove', this.drawTouch as any, {
      passive: false,
    });
    window.addEventListener('touchend', this.endDrawTouch as any);
  }

  // ⚠️ NUEVO: cargar una imagen base64 para restaurar la firma del usuario
  // ✅ Restaura una firma desde base64
  load(dataUrl: string) {
    if (!isPlatformBrowser(this.platformId) || !dataUrl) return;
    if (!this.isBrowser || !dataUrl) return;
    const img = new Image();
    img.onload = () => {
      const canvas = this.canvasRef.nativeElement;
      // limpiar con transform neutralizado
      this.ctx.restore();

      this.ctx.clearRect(0, 0, canvas.width, canvas.height);

      this.ctx.save();
      const dpr = window.devicePixelRatio || 1;
      this.ctx.scale(dpr, dpr);

      this.ctx.drawImage(img, 0, 0, canvas.clientWidth, canvas.clientHeight);
      this.hasStrokes = true;
      this.onChange.emit(dataUrl); // 👈 emitimos el mismo base64 restaurado
    };
    img.src = dataUrl;
  }

  /** Limpia el canvas correctamente aunque esté escalado */
  clear() {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!this.isBrowser) return;
    const canvas = this.canvasRef.nativeElement;

    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0); // quita el scale(dpr,dpr)
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.ctx.restore();

    this.hasStrokes = false;
    this.onChange.emit(null); // 👈 null = sin firma
  }

  /** Checkbox de huella (emite al padre) */
  onHuellaCheckbox(e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    this.huellaChange.emit(checked);
  }

  toggleHuella(event: any, dec: any) {
    this.mostrarHuella = event.target.checked;

    if (this.mostrarHuella) {
      const ordenDataString = localStorage.getItem('ordenData');
      if (!ordenDataString) return;
      const { codEmp, codSed, codTCl, numOrd } = JSON.parse(ordenDataString);

      this.huellaUrl = this.siglaservice.getHuellaUrl({
        codEmp,
        codSed,
        codTCl,
        numOrd,
        codDec: dec.codDec,
      });
    } else {
      this.huellaUrl = null;
    }
  }
  /** Convierte la firma a PNG con fondo blanco */
  toDataURL(withWhiteBackground: boolean = true): string {
    if (!isPlatformBrowser(this.platformId)) return '';

    if (!this.isBrowser) return '';
    const src = this.canvasRef.nativeElement;

    if (!withWhiteBackground) return src.toDataURL('image/png');

    const tmp = document.createElement('canvas');
    tmp.width = src.width;
    tmp.height = src.height;
    const tctx = tmp.getContext('2d')!;
    tctx.fillStyle = '#ffffff';
    tctx.fillRect(0, 0, tmp.width, tmp.height);
    tctx.drawImage(src, 0, 0);
    return tmp.toDataURL('image/png');
  }

  // ======= eventos de dibujo =======
  private getPos(e: MouseEvent | Touch) {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    return {
      x: (e as any).clientX - rect.left,
      y: (e as any).clientY - rect.top,
    };
  }

  private startDraw = (e: MouseEvent) => {
    this.drawing = true;
    const { x, y } = this.getPos(e);
    this.lastX = x;
    this.lastY = y;
  };

  private draw = (e: MouseEvent) => {
    if (!this.drawing) return;
    const { x, y } = this.getPos(e);
    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    this.lastX = x;
    this.lastY = y;

    // ❌ ya no emites boolean; solo marca que hay trazos
    if (!this.hasStrokes) this.hasStrokes = true;
  };

  private endDraw = (_e: MouseEvent) => {
    this.drawing = false;
    // 🔥 Captura la firma completa al SOLTAR (ya terminó de dibujar)
    const dataUrl = this.hasStrokes ? this.toDataURL(true) : null;
    this.onChange.emit(dataUrl); // 👈 aquí sí emites base64 o null
  };

  private startDrawTouch = (e: TouchEvent) => {
    e.preventDefault();
    const t = e.touches[0];
    const { x, y } = this.getPos(t);
    this.drawing = true;
    this.lastX = x;
    this.lastY = y;
  };

  private drawTouch = (e: TouchEvent) => {
    e.preventDefault();
    if (!this.drawing) return;
    const t = e.touches[0];
    const { x, y } = this.getPos(t);
    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    this.lastX = x;
    this.lastY = y;

    // ❌ no emitas boolean aquí
    if (!this.hasStrokes) this.hasStrokes = true;
  };

  private endDrawTouch = (_e: TouchEvent) => {
    this.drawing = false;
    const dataUrl = this.hasStrokes ? this.toDataURL(true) : null;
    this.onChange.emit(dataUrl);
  };
}
