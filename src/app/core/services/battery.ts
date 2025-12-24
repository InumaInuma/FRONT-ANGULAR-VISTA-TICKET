import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';

export interface BatteryInfo {
  level: number; // Porcentaje 0-100
  charging: boolean; // Si está cargando
  supported: boolean; // Si el API está disponible
}

@Injectable({
  providedIn: 'root',
})
export class Battery {
  private readonly MIN_BATTERY = 50; // Mínimo 20%

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  /**
   * 🔋 Obtiene el nivel actual de batería del dispositivo
   */
  async getBatteryLevel(): Promise<BatteryInfo> {
    // Verificar si estamos en el navegador
    if (!isPlatformBrowser(this.platformId)) {
      return { level: 100, charging: false, supported: false };
    }

    try {
      // Verificar si Battery API está disponible
      const nav = navigator as any;
      if (!nav.getBattery) {
        console.warn('⚠️ Battery API no disponible');
        return { level: 100, charging: false, supported: false };
      }

      // Obtener información de la batería
      const battery = await nav.getBattery();
      const level = Math.round(battery.level * 100);

      console.log(
        `🔋 Nivel de batería: ${level}%`,
        battery.charging ? '🔌 Cargando' : ''
      );

      return {
        level: level,
        charging: battery.charging,
        supported: true,
      };
    } catch (error) {
      console.error('❌ Error al obtener batería:', error);
      return { level: 100, charging: false, supported: false };
    }
  }

  /**
   * 🔋 Verifica si hay batería suficiente
   * Retorna true si: batería >= 20% O está cargando O API no soportada
   */
  async hasSufficientBattery(): Promise<boolean> {
    const info = await this.getBatteryLevel();

    // Si no está soportado, permitir acceso
    if (!info.supported) {
      return true;
    }

    // Si está cargando, permitir acceso
    if (info.charging) {
      console.log('🔌 Dispositivo cargando - Acceso permitido');
      return true;
    }

    // Verificar nivel mínimo
    const sufficient = info.level >= this.MIN_BATTERY;

    if (!sufficient) {
      console.warn(
        `⚠️ Batería insuficiente: ${info.level}% (mínimo: ${this.MIN_BATTERY}%)`
      );
    }

    return sufficient;
  }
}
