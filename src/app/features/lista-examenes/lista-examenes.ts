import {
  AfterViewInit,
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import { SiglaService } from '../../core/services/sigla';
import JsBarcode from 'jsbarcode';
import { CommonModule } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';
import { Inject, PLATFORM_ID } from '@angular/core';
import { Subscription } from 'rxjs/internal/Subscription';
import { BehaviorSubject, combineLatest, map, Observable } from 'rxjs';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Router } from '@angular/router';
import { Examen } from '../../models/examen.interface';
import { RespuestaDetalle } from '../../models/respuestaDetalle.interface';
import { CuestionarioCompleto } from '../../models/cuestionarioCompleto.interface';
import { Serviciologin } from '../../core/services/serviciologin';
import { ServiciosRealtime } from '../../core/services/servicios-realtime';
import { ServicioDeclaraciones } from '../../core/services/servicio-declaraciones';
import { ServiciosExamenes } from '../../core/services/servicios-examenes';
import { ServiciosCuestionario } from '../../core/services/servicios-cuestionario';

@Component({
  selector: 'app-lista-examenes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lista-examenes.html',
  styleUrls: ['./lista-examenes.scss'],
})
export class ListaExamenesComponent implements OnInit, OnDestroy {
  // ✅ Cambia la visibilidad de private a public
  private allExamsCompletedSubject = new BehaviorSubject<boolean>(false);
  private isQuestionnaireCompletedSubject = new BehaviorSubject<boolean>(false);

  // ✅ El observable que la plantilla usa
  public isQuestionnaireReady$ = combineLatest([
    this.allExamsCompletedSubject,
    this.isQuestionnaireCompletedSubject,
  ]).pipe(
    map(
      ([allExamsCompleted, isQuestionnaireCompleted]: [boolean, boolean]) =>
        allExamsCompleted && !isQuestionnaireCompleted
    )
  );
  // ✅ Nueva propiedad para controlar el modal
  showCompletionModal = false;
  examenes: Examen[] = [];
  errorMsg: string | null = null;
  private subs = new Subscription();

  // ✅ Nueva variable para el estado de completado del cuestionario
  isQuestionnaireCompleted: boolean = false;
  showSurveyModal = false; // ✅ Se usará para mostrar el único modal
  currentQuestionIndex = 0; // ✅ Se mantiene para rastrear la pregunta actual
  surveyQuestions: any[] = []; // ✅ Tus preguntas y opciones
  isLoadingQuestions = false; // ✅ Nueva variable de estado para la carga
  // --- dentro de la clase ---
  public allExamsCompleted$!: Observable<boolean>; // público para la plantilla
  // ✅ Tu array de opciones fijo
  surveyOptions = [
    'Muy insatisfecho 😠',
    'Insatisfecho 🙁',
    'Satisfecho 😊',
    'Muy satisfecho 😄',
  ];

  // ✅ Array para las 13 opciones de las preguntas 6 y 7
  multipleOptions13 = [
    'RECEPCION',
    'LABORATORIO',
    'TRIAJE',
    'ELECTROCARDIOGRAMA',
    'ESPIROMETRIA',
    'MEDICINA GENERAL',
    'RADIOLOGIA',
    'VACUNAS',
    'PSICOLOGIA',
    'OFTALMOLOGIA',
    'PRUEBA DE ESFUERZO',
    'AUDIOMETRIA',
    'NINGUNA DE LAS ALTERNATIVAS',
  ];

  // ✅ Array para las 10 opciones de la pregunta 9
  multipleOptions10 = [
    'UBICACION CLINICA',
    'SEÑALIZACION',
    'COMODIDAD DE INSTALACIONES',
    'AMABILIDAD EN LA ATENCION',
    'DISPOSICION A RESOLVER DUDAS',
    'CLARIDAD EN CONSULTAS REALIZADAS',
    'ORDEN DE LLAMADO PARA LA ATENCION',
    'LIMPIEZA DE LAS INSTALACIONES',
    'DISPOSICION DEL ESPACIO FISICO',
    'NINGUNA DE LAS ALTERNATIVAS',
  ];

  // ✅ Nueva propiedad para recolectar las respuestas
  // ✅ Colección de todas las respuestas del cuestionario
  private respuestasRecolectadas: RespuestaDetalle[] = [];
  private respuestasPreguntaActual: number[] = []; // ✅ Nueva: para recolectar las respuestas múltiples de la pregunta actual
  // ✅ Propiedad para controlar el estado de deshabilitado de los botones de opción
  private optionsDisabledForCurrentQuestion = false;

  // modal declaracion
  showDeclaracionModalFlag = false;
  pendingDeclaracionPayload: any = null;
  lastHandledDeclId: number | null = null;

  constructor(
    private siglaService: SiglaService,
    private servicioLogin: Serviciologin,
    private servicioDeclaraciones: ServicioDeclaraciones,
    private servicioExamenes: ServiciosExamenes,
    private servicioCuestionario: ServiciosCuestionario,
    private cdr: ChangeDetectorRef,
    private servicioRealTime: ServiciosRealtime,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: any
  ) {}

  // 🚨 Método para cerrar la sesión
  onLogout(): void {
    this.siglaService.logout();
  }

  // Método para alternar el despliegue
  toggleSubExamenes(examen: Examen): void {
    examen.isExpanded = !examen.isExpanded;
  }

  ngOnInit(): void {
    history.pushState(null, '', location.href);
    window.onpopstate = () => {
      history.pushState(null, '', location.href);
    };
    try {
      if (!isPlatformBrowser(this.platformId)) return;
      // ✅ Obtener los datos de la orden desde localStorage
      // Lectura segura de localStorage
      const ordenDataString = localStorage.getItem('ordenData'); // suele guardarse cuando hay orden completa
      const ordenDataStringDni = localStorage.getItem('ordenDataDni'); // guardado en el primer login

      // Helper: parse seguro
      const safeParse = <T>(s: string | null): T | null => {
        if (!s) return null;
        try {
          return JSON.parse(s) as T;
        } catch (e) {
          console.error('JSON parse error', e);
          return null;
        }
      };

      const ordenData = safeParse<any>(ordenDataString);
      const ordenDataDni = safeParse<any>(ordenDataStringDni);

      // Extraer campos preferiendo ordenData, si faltan caer a ordenDataDni
      const codEmp = ordenData?.codEmp ?? ordenDataDni?.codEmp ?? null;
      const codSed = ordenData?.codSed ?? ordenDataDni?.codSed ?? null;
      const codTCl = ordenData?.codTCl ?? ordenDataDni?.codTCl ?? null;
      const numOrd = ordenData?.numOrd ?? ordenDataDni?.numOrd ?? null;

      const idTicked = ordenDataDni?.idTicked ?? ordenData?.idTicked ?? null;
      const nroTic = ordenDataDni?.nroTic ?? ordenData?.nroTic ?? null;
      const nroDocumento =
        ordenDataDni?.nroDocumento ?? ordenData?.nroDocumento ?? null;

      // Si no tenemos al menos identificación del ticket o número de documento -> salir al login
      if (!idTicked || !nroDocumento) {
        console.warn(
          'No se encontraron datos de ticket/usuario en localStorage. Redirigiendo a login.'
        );
        this.siglaService.logout(); // o this.router.navigate(['/login'])
        return;
      }
      // Ahora puedes usar estos datos para todas las llamadas
      // Generar el código de barras con JsBarcode
      const barcodeValue = `${codEmp}-${codSed}-${codTCl}-${numOrd}`;
      JsBarcode('#barcode', barcodeValue, {
        format: 'CODE128', // Puedes cambiar el formato aquí
        displayValue: false, // Mostrar el valor debajo del código de barras
        width: 5, // Grosor de las barras
        height: 100, // Altura del código de barras
        margin: 10, // Margen alrededor del código de barras
      });

      // 1. INICIAR Y ESPERAR la conexión de SignalR
      this.siglaService
        .startSignalRConnection(codEmp, codSed, codTCl, numOrd)
        .then(() => {
          console.log(
            '✅ Conexión SignalR lista. Iniciando escucha y carga de datos.'
          );

          // 2. INICIAR la escucha de Real Time PRIMERO (antes de la llamada a la API)
          const realtimeSub = this.siglaService.examenes$.subscribe(
            (newdata) => {
              console.log(
                '📡 Exámenes recibidos en tiempo real (Orden):',
                newdata
              );

              // 💡 Lógica para preservar el estado "isExpanded"
              this.examenes = newdata.map((newExamen) => {
                const oldExamen = this.examenes.find(
                  (e) => e.codSer === newExamen.codSer
                );

                return {
                  ...newExamen,
                  isExpanded: oldExamen ? oldExamen.isExpanded : false,
                };
              });

              this.cdr.detectChanges(); // <-- Forzar la detección de cambios
              this.checkCompletionStatus(); // ✅ Verificar estado de completitud
            }
          );
          this.subs.add(realtimeSub);

          // LLAMADA IMPORTANTE: solicita declaraciones para que el backend inicie la suscripción
          this.siglaService
            .getDeclaraciones(codEmp, codSed, codTCl, numOrd)
            .subscribe({
              next: (decls) => {
                console.log('Declaraciones iniciales recibidas:', decls);
                // si quieres almacenar iniciales
              },
              error: (err) =>
                console.warn(
                  'No se pudieron cargar declaraciones iniciales',
                  err
                ),
            });

          // en ngOnInit ya lees el processed id:
          this.lastHandledDeclId =
            this.siglaService.getProcessedDeclarationId();
          /* 2) Suscribirse al subject de declaraciones (SignalR) */
          // dentro de ngOnInit, reemplaza/ajusta tu handler de declaracion$ por este:
          const declSub = this.siglaService.declaracion$
            .pipe()
            .subscribe((payload) => {
              if (!payload) return;

              console.log('DEBUG payload DeclaracionAdded raw:', payload);

              // Normalizar a array
              const decls = Array.isArray(payload)
                ? payload
                : payload.declaracion ?? payload;
              if (!decls || decls.length === 0) return;

              const first = decls[0];

              // normalizar id (tolerante a capitalización)
              const idDecl = first.idDecl ?? first.IdDecl ?? first.Id ?? null;
              if (!idDecl) return;

              // Si ya procesamos este id (persistido), no mostrar
              if (
                this.lastHandledDeclId &&
                Number(this.lastHandledDeclId) === Number(idDecl)
              ) {
                console.log(
                  '⚠️ Declaración ya procesada (persistida), no mostrar modal',
                  idDecl
                );
                return;
              }

              // Extraer campos tolerantes (variantes de nombres)
              const pCodEmp =
                first.CodEmp ??
                first.codEmp ??
                first.codemp ??
                first.CodEmpId ??
                null;
              const pCodSed =
                first.CodSed ?? first.codSed ?? first.codsed ?? null;
              const pCodTCl =
                first.CodTCl ?? first.codTCl ?? first.codtcl ?? null;
              const pNumOrd =
                first.NumOrd ??
                first.numOrd ??
                first.numord ??
                first.NumOrd ??
                null;

              console.log('DEBUG normalized declaracion:', {
                pCodEmp,
                pCodSed,
                pCodTCl,
                pNumOrd,
              });

              // Valores de la orden local (extraídos en tu ngOnInit)
              const localOrdenStr =
                localStorage.getItem('ordenData') ||
                localStorage.getItem('ordenDataDni');
              let localCodEmp: any = null,
                localCodSed: any = null,
                localCodTCl: any = null,
                localNumOrd: any = null;
              if (localOrdenStr) {
                try {
                  const o = JSON.parse(localOrdenStr);
                  localCodEmp = o.codEmp ?? o.CodEmp ?? null;
                  localCodSed = o.codSed ?? o.CodSed ?? null;
                  localCodTCl = o.codTCl ?? o.CodTCl ?? null;
                  localNumOrd = o.numOrd ?? o.NumOrd ?? o.NumOrd ?? null;
                } catch {}
              }

              // Convertir a número si es posible
              const match =
                (pCodEmp == null ||
                  localCodEmp == null ||
                  Number(pCodEmp) === Number(localCodEmp)) &&
                (pCodSed == null ||
                  localCodSed == null ||
                  Number(pCodSed) === Number(localCodSed)) &&
                (pCodTCl == null ||
                  localCodTCl == null ||
                  Number(pCodTCl) === Number(localCodTCl)) &&
                (pNumOrd == null ||
                  localNumOrd == null ||
                  Number(pNumOrd) === Number(localNumOrd));

              // Si la API no envía CodEmp/CodSed/CodTCl, nos basamos en NumOrd únicamente
              const fallbackMatch = Number(pNumOrd) === Number(localNumOrd);

              if (match || fallbackMatch) {
                // guardar en memoria temporal y en session/local storage por si hay navegación
                this.lastHandledDeclId = idDecl;
                // Persistir inmediatamente para evitar re-fires al navegar
                this.siglaService.setProcessedDeclarationId(idDecl);
                console.log(
                  '✅ Nueva declaracion PARA ESTA ORDEN detectada -> mostrando modal'
                );
                this.pendingDeclaracionPayload = decls;
                this.showDeclaracionModalFlag = true;
                // bloquear scroll y entradas
                document.body.style.overflow = 'hidden';
                // Forzar detectChanges para asegurarnos que el modal aparece
                this.cdr.detectChanges();
              } else {
                console.log(
                  '⚠️ Declaracion recibida, pero no coincide con la orden local.',
                  {
                    pCodEmp,
                    pCodSed,
                    pCodTCl,
                    pNumOrd,
                    localCodEmp,
                    localCodSed,
                    localCodTCl,
                    localNumOrd,
                  }
                );
              }
            });
          this.subs.add(declSub);

          // 3. UNIRSE al grupo de SignalR (la conexión ya está garantizada)
          this.siglaService.joinOrderGroup(codEmp, codSed, codTCl, numOrd);

          // 4. LLAMAR a la API para obtener datos iniciales y disparar la suscripción de SqlDependency en el backend
          this.subs.add(
            this.siglaService
              .getExamenes(codEmp, codSed, codTCl, numOrd, idTicked)
              .subscribe({
                next: (data) => {
                  // Cargar datos iniciales. Es una redundancia, pero necesario para el primer render.
                  // Si la notificación de RT llega rápido, 'realtimeSub' la manejará.
                  if (this.examenes.length === 0) {
                    // Solo si no se ha cargado por RT
                    this.examenes = data.map((ex) => ({
                      ...ex,
                      isExpanded: false,
                    }));
                    this.checkCompletionStatus();
                  }
                  this.cdr.detectChanges();
                },
                error: (err) =>
                  console.error('❌ Error al cargar exámenes iniciales', err),
              })
          );
        })
        .catch((err) => {
          console.error('❌ Fallo al iniciar SignalR o cargar datos:', err);
          // Manejo de error de conexión inicial
        });
    } catch (error) {
      console.error('❌ Error al parsear ordenData:', error);
      this.errorMsg = 'Error al procesar la información de la orden.';
    }
    this.allExamsCompleted$ = this.allExamsCompletedSubject.asObservable();
  }

  goToDeclaracionesFromModal() {
    // persistir pending para que consent lo use
    try {
      this.siglaService.setPendingDeclarationForConsent(
        this.pendingDeclaracionPayload
      );
    } catch {}
    this.showDeclaracionModalFlag = false;
    document.body.style.overflow = 'auto';
    // NO limpiar processed id aquí: lo queremos mantener para que no vuelva a aparecer
    this.router.navigate(['/consent']);
  }

  // Método para descargar PDF optimizado
  async downloadPdf(): Promise<void> {
    const card = document.getElementById('pdf-card') as HTMLElement;
    if (!card) {
      alert('No se encontró la sección para generar el PDF.');
      return;
    }

    // ocultar temporalmente el botón para que no aparezca en la captura
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) downloadBtn.style.visibility = 'hidden';

    // esperar un par de frames para que angular haya pintado todo
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);

    // Asegurar que fuentes externas estén cargadas (si usas Google Fonts)
    if ((document as any).fonts && (document as any).fonts.ready) {
      try {
        await (document as any).fonts.ready;
      } catch {
        /* no bloquear si falla */
      }
    }

    // Opcional: convertir SVGs internos (ej. barcode) a IMG para evitar rasterizado flojo
    const svgs = Array.from(card.querySelectorAll('svg'));
    for (const svg of svgs) {
      try {
        const serializer = new XMLSerializer();
        let svgStr = serializer.serializeToString(svg as SVGElement);
        if (!svgStr.includes('xmlns')) {
          svgStr = svgStr.replace(
            /^<svg/,
            '<svg xmlns="http://www.w3.org/2000/svg"'
          );
        }
        const svg64 = btoa(unescape(encodeURIComponent(svgStr)));
        const imgSrc = 'data:image/svg+xml;base64,' + svg64;
        const img = document.createElement('img');
        const rect = (svg as SVGElement).getBoundingClientRect();
        img.width = Math.round(rect.width);
        img.height = Math.round(rect.height);
        img.src = imgSrc;
        svg.parentNode?.replaceChild(img, svg);
      } catch (e) {
        console.warn('No se pudo convertir SVG:', e);
      }
    }

    // esperar que imágenes internas terminen de cargar
    const imgs = Array.from(card.querySelectorAll('img')) as HTMLImageElement[];
    await Promise.all(
      imgs.map((img) => {
        if (img.complete && img.naturalWidth !== 0) return Promise.resolve();
        return new Promise<void>((res) => {
          img.onload = () => res();
          img.onerror = () => res();
        });
      })
    );

    // breve pausa para estabilidad
    await new Promise((r) => setTimeout(r, 120));

    try {
      // escala alta para nitidez (3 = buena calidad). Si el PDF pesa mucho, baja a 2.
      const scale = 3;
      const canvas = await html2canvas(card, {
        scale,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      // ajustar ancho PDF y altura proporcional
      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      const pageHeight = pdf.internal.pageSize.getHeight(); // 297

      if (imgHeight <= pageHeight) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
      } else {
        // paginación simple cortando el canvas en trozos verticales
        const pxPerMm = canvas.width / pdfWidth;
        const pageHeightPx = Math.floor(pageHeight * pxPerMm);
        const pageCanvas = document.createElement('canvas');
        const pageCtx = pageCanvas.getContext('2d')!;
        pageCanvas.width = canvas.width;
        pageCanvas.height = pageHeightPx;

        let y = 0;
        let first = true;
        while (y < canvas.height) {
          pageCtx.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
          pageCtx.drawImage(
            canvas,
            0,
            y,
            canvas.width,
            pageCanvas.height,
            0,
            0,
            pageCanvas.width,
            pageCanvas.height
          );
          const pageData = pageCanvas.toDataURL('image/png');
          const pageHeightMM =
            (pageCanvas.height * pdfWidth) / pageCanvas.width;

          if (first) {
            pdf.addImage(pageData, 'PNG', 0, 0, pdfWidth, pageHeightMM);
            first = false;
          } else {
            pdf.addPage();
            pdf.addImage(pageData, 'PNG', 0, 0, pdfWidth, pageHeightMM);
          }
          y += pageCanvas.height;
        }
      }

      // nombre de archivo usando nroDocumento si está
      const ordenStr =
        localStorage.getItem('ordenData') ||
        localStorage.getItem('ordenDataDni');
      let fileName = 'resumen_examenes.pdf';
      if (ordenStr) {
        try {
          const o = JSON.parse(ordenStr);
          const nro = o?.nroDocumento ?? o?.nroDId ?? null;
          if (nro) fileName = `examenes_${nro}.pdf`;
        } catch {}
      }

      pdf.save(fileName);
    } catch (err) {
      console.error('Error generando PDF:', err);
      alert('Ocurrió un error al generar el PDF. Revisa consola.');
    } finally {
      // restaurar visibilidad del botón
      if (downloadBtn) downloadBtn.style.visibility = '';
    }
  }

  // ✅ Método para verificar el estado de la encuesta
  private checkCompletionStatus(): void {
    if (this.examenes.length === 0) {
      this.allExamsCompletedSubject.next(false);
      return;
    }

    const allExamsCompleted = this.examenes.every(
      (examen) => examen.estado === 3
    );
    this.allExamsCompletedSubject.next(allExamsCompleted);

    if (allExamsCompleted) {
      const ordenDataString = localStorage.getItem('ordenData');
      if (ordenDataString) {
        const ordenData = JSON.parse(ordenDataString);
        const codPer = ordenData.codPer;

        this.siglaService.getCuestionarioEstado(codPer).subscribe({
          next: (response) => {
            // ✅ Actualiza la variable de clase para que la plantilla lo use directamente
            this.isQuestionnaireCompleted = response.completado;
            this.isQuestionnaireCompletedSubject.next(response.completado);

            // ✅ NUEVA LÓGICA: Si los exámenes están completos Y el cuestionario no está completo,
            // carga las preguntas del cuestionario AHORA
            if (allExamsCompleted && !response.completado) {
              this.loadQuestionnaireQuestions();
            }
          },
          error: (err) => {
            console.error(
              'Error al verificar el estado del cuestionario:',
              err
            );
            this.isQuestionnaireCompletedSubject.next(false);
          },
        });
      } else {
        this.isQuestionnaireCompletedSubject.next(false);
      }
    } else {
      this.isQuestionnaireCompletedSubject.next(false);
    }
  }
  // ✅ Crea un nuevo método para la carga de preguntas
  private loadQuestionnaireQuestions(): void {
    this.isLoadingQuestions = true;
    this.siglaService.getCuestionarioPreguntas().subscribe({
      next: (preguntas) => {
        console.log('Preguntas del cuestionario cargadas y listas:', preguntas);
        this.surveyQuestions = preguntas;
        this.isLoadingQuestions = false;
      },
      error: (err) => {
        console.error('Error al cargar las preguntas del cuestionario:', err);
        this.isLoadingQuestions = false;
        // Puedes manejar este error de forma más elegante en la interfaz de usuario si es necesario.
      },
    });
  }
  // ✅ Método para iniciar la encuesta al hacer clic en el botón

  startQuestionnaire(): void {
    // ✅ 1. Activa el estado de carga para el usuario
    this.isLoadingQuestions = true;

    // ✅ 2. Realiza la llamada a la API para obtener las preguntas
    this.siglaService.getCuestionarioPreguntas().subscribe({
      next: (preguntas) => {
        this.surveyQuestions = preguntas;
        this.isLoadingQuestions = false; // Desactiva el estado de carga
        console.log('Preguntas del cuestionario cargadas y listas:', preguntas);
        // ✅ 3. Solo si se reciben preguntas, muestra el modal y reinicia el índice.
        if (this.surveyQuestions && this.surveyQuestions.length > 0) {
          this.showSurveyModal = true;
          this.currentQuestionIndex = 0;
          // ✅ Resetea el estado de opciones deshabilitadas para la nueva pregunta
          this.optionsDisabledForCurrentQuestion = false;
          this.cdr.detectChanges(); // Forzar detección de cambios
        } else {
          alert(
            'No se encontraron preguntas para el cuestionario. Por favor, inténtalo de nuevo más tarde.'
          );
        }
      },
      error: (err) => {
        console.error('Error al cargar las preguntas del cuestionario:', err);
        alert(
          'No se pudieron cargar las preguntas del cuestionario. Por favor, inténtalo de nuevo.'
        );
        this.isLoadingQuestions = false; // Desactiva el estado de carga en caso de error
      },
    });
  }

  recolectarRespuesta(respuesta: number): void {
    const preguntaActual = this.getCurrentQuestion();
    if (!preguntaActual) return; // Salir si no hay pregunta actual
    const preguntaID = preguntaActual.id;

    // Lógica para las preguntas 7, 8 y 9 (múltiples selecciones)
    if (preguntaID >= 7 && preguntaID <= 9) {
      const index = this.respuestasPreguntaActual.indexOf(respuesta);

      // Si la respuesta ya está en el array, la desmarca (la elimina)
      if (index > -1) {
        this.respuestasPreguntaActual.splice(index, 1);
      } else {
        // Si la respuesta no está, la agrega, pero verifica el límite para preguntas 7 y 8
        if (
          (preguntaID === 7 || preguntaID === 8) &&
          this.respuestasPreguntaActual.length >= 3
        ) {
          // Si ya hay 3 respuestas, no permite agregar más.
          alert(
            'Solo puedes seleccionar un máximo de 3 opciones para esta pregunta.'
          );
          return; // Sale de la función sin agregar la respuesta
        }
        this.respuestasPreguntaActual.push(respuesta);
      }
    } else {
      // Para las preguntas de una sola respuesta (1-6)
      // Solo permite una selección y avanza automáticamente.
      this.respuestasPreguntaActual = [respuesta];
      this.pasarSiguientePregunta(); // Avanza a la siguiente pregunta
    }
    // Forzar la detección de cambios para que la UI se actualice
    this.cdr.detectChanges();
  }
  // ✅ Nuevo método para verificar si un botón debe estar activo
  esBotonSeleccionado(respuesta: number): boolean {
    return this.respuestasPreguntaActual.includes(respuesta);
  }
  //Este método verificará el ID de la pregunta actual y devolverá el array de opciones correspondiente.
  getOptionsForCurrentQuestion(): string[] {
    const preguntaActual = this.getCurrentQuestion();
    if (!preguntaActual) {
      return [];
    }
    const preguntaID = preguntaActual.id;

    if (preguntaID === 7 || preguntaID === 8) {
      return this.multipleOptions13;
    } else if (preguntaID === 9) {
      return this.multipleOptions10;
    } else {
      return []; // Devuelve un array vacío si no coincide con las preguntas
    }
  }
  // ✅ Nuevo método para verificar si un botón de opción está deshabilitado
  isOptionDisabled(preguntaId: number, opcionId: number): boolean {
    // La lógica de bloqueo solo se aplica a las preguntas 6 y 7
    if (preguntaId === 7 || preguntaId === 8) {
      // Deshabilita las opciones si ya se han seleccionado 3 y si la opción actual no está seleccionada
      if (
        this.respuestasPreguntaActual.length >= 3 &&
        !this.esBotonSeleccionado(opcionId)
      ) {
        return true;
      }
    }
    return false;
  }

  // ✅ Nuevo método para manejar el avance a la siguiente pregunta
  pasarSiguientePregunta(): void {
    const preguntaActual = this.getCurrentQuestion();
    if (!preguntaActual) return; // Salir si no hay pregunta actual

    // ✅ Guarda la respuesta de la pregunta actual en el array de respuestas recolectadas
    // Solo guarda si hay respuestas seleccionadas o si es una pregunta de una sola opción
    if (this.respuestasPreguntaActual.length > 0 || preguntaActual.id < 7) {
      this.respuestasRecolectadas.push({
        IDPre: preguntaActual.id,
        Rpts: this.respuestasPreguntaActual,
      });
    } else if (
      // Si es una pregunta de multi-selección (7-9) y no se seleccionó nada, se registra un array vacío.
      // Esto podría ser útil si el backend espera una entrada para cada pregunta.
      preguntaActual.id >= 7 &&
      preguntaActual.id <= 9 &&
      this.respuestasPreguntaActual.length === 0
    ) {
      this.respuestasRecolectadas.push({ IDPre: preguntaActual.id, Rpts: [] });
    } else {
      // Si por alguna razón no hay respuesta y no es una pregunta de multi-select que deba tener entrada vacía
      console.warn(
        `No se guardó respuesta para la pregunta ${preguntaActual.id} porque no había selecciones válidas.`
      );
    }

    // ✅ Limpia el array de respuestas para la próxima pregunta
    this.respuestasPreguntaActual = [];

    // ✅ Pasa a la siguiente pregunta o finaliza el cuestionario
    if (this.currentQuestionIndex < this.surveyQuestions.length - 1) {
      this.currentQuestionIndex++;
      // ✅ Resetea el estado de opciones deshabilitadas para la nueva pregunta
      this.optionsDisabledForCurrentQuestion = false;
    } else {
      this.enviarCuestionarioCompleto();
    }
    this.cdr.detectChanges(); // Forzar la actualización de la vista
  }

  // ✅ Nuevo método para enviar el cuestionario completo
  private enviarCuestionarioCompleto(): void {
    const ordenDataString = localStorage.getItem('ordenData');
    if (!ordenDataString) {
      console.error('No se encontró CodPer en localStorage.');
      alert(
        'Error: No se puede guardar el cuestionario. Por favor, reinicia la sesión.'
      );
      return;
    }

    const ordenData = JSON.parse(ordenDataString);
    const codPer = ordenData.codPer;

    // ✅ Crea el objeto completo para enviar
    const cuestionarioCompleto: CuestionarioCompleto = {
      CodPer: codPer,
      Comentario: 'Comentario de la encuesta.', // ✅ Puedes usar un campo de texto en tu modal para esto
      Respuestas: this.respuestasRecolectadas,
    };

    // ✅ ¡Importante! Agrega esta línea para ver el JSON completo
    console.log(
      'JSON a enviar:',
      JSON.stringify(cuestionarioCompleto, null, 2)
    );

    this.siglaService
      .guardarCuestionarioCompleto(cuestionarioCompleto)
      .subscribe({
        next: (response) => {
          console.log('Cuestionario completo guardado con éxito:', response);
          alert('Gracias por ayudarnos a mejorar. 😊');
          // ✅ Actualiza el estado del cuestionario a completado
          this.isQuestionnaireCompletedSubject.next(true); // ✅ Emite el estado "completado"
          this.allExamsCompletedSubject.next(true);
          this.onLogout();
        },
        error: (err) => {
          console.error('Error al guardar el cuestionario completo:', err);
          alert(
            'Ocurrió un error al guardar el cuestionario. Por favor, inténtalo de nuevo.'
          );
        },
      });
  }

  // ✅ Método para cerrar el modal
  closeModalC(): void {
    this.showSurveyModal = false;
    // ✅ Opcional: Resetear el estado del cuestionario si se cierra sin completar
    this.cdr.detectChanges();
  }
  // ✅ Método para obtener la pregunta actual
  getCurrentQuestion() {
    // Se añade un chequeo de seguridad por si acaso
    if (
      this.surveyQuestions &&
      this.surveyQuestions.length > 0 &&
      this.currentQuestionIndex >= 0 &&
      this.currentQuestionIndex < this.surveyQuestions.length
    ) {
      return this.surveyQuestions[this.currentQuestionIndex];
    }
    return null; // Devuelve null si no hay pregunta válida
  }
  // ✅ Método para cerrar el modal
  closeModal(): void {
    this.showCompletionModal = false;
  }

  ngOnDestroy(): void {
    // ⚠️ No detengas la conexión aquí. El servicio lo maneja.
    this.subs.unsubscribe();
    document.body.style.overflow = '';
  }

  // ... (tu método getEstadoNombre)
  getEstadoNombre(estado: number): string {
    switch (estado) {
      case 0:
        return 'En cola';
      case 1:
        return 'Llamando';
      case 3:
        return 'Atendido';
      case 4:
        return 'En espera';
      default:
        return 'Desconocido';
    }
  }
}
