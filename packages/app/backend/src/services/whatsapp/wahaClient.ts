import axios, { AxiosInstance, AxiosError } from 'axios';
import logger from '../../utils/logger';
import { ServiceUnavailableError } from '../../utils/errors';

// ── Types ─────────────────────────────────────────────────────────

export interface WahaSessionStatus {
  name: string;
  status: string;
  me?: { id: string };
}

export interface WahaQrCode {
  mimetype: string;
  data: string;
}

export interface WahaFilePayload {
  data: string;
  filename: string;
  mimetype: string;
}

export interface WahaSendResponse {
  id: string;
}

// ── Client ────────────────────────────────────────────────────────

export class WahaClient {
  private http: AxiosInstance;

  constructor(baseURL: string, apiKey?: string) {
    this.http = axios.create({
      baseURL,
      timeout: 10_000,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'X-Api-Key': apiKey } : {}),
      },
    });
  }

  // ── Session Management ────────────────────────────────────────

  async createSession(name: string): Promise<void> {
    try {
      await this.http.post('/api/sessions', { name });
    } catch (error) {
      // Allow 422 errors to pass through so caller can handle "session already exists"
      const axiosErr = error as AxiosError;
      if (axiosErr?.response?.status === 422) {
        throw error;
      }
      this.handleError('createSession', error);
    }
  }

  async startSession(name: string): Promise<void> {
    try {
      await this.http.post(`/api/sessions/${name}/start`);
    } catch (error) {
      // Allow 422 errors to pass through so caller can handle "session already started"
      const axiosErr = error as AxiosError;
      if (axiosErr?.response?.status === 422) {
        throw error;
      }
      this.handleError('startSession', error);
    }
  }

  async stopSession(name: string): Promise<void> {
    try {
      await this.http.post(`/api/sessions/${name}/stop`);
    } catch (error) {
      this.handleError('stopSession', error);
    }
  }

  async deleteSession(name: string): Promise<void> {
    try {
      await this.http.delete(`/api/sessions/${name}`);
    } catch (error) {
      this.handleError('deleteSession', error);
    }
  }

  async getSessionStatus(name: string): Promise<WahaSessionStatus> {
    try {
      const { data } = await this.http.get(`/api/sessions/${name}`);
      return data;
    } catch (error) {
      this.handleError('getSessionStatus', error);
      throw error; // unreachable, satisfies TS
    }
  }

  async getQrCode(name: string): Promise<WahaQrCode> {
    try {
      // WAHA returns QR code as a PNG image, not JSON
      // We need to get it as arraybuffer and convert to base64
      const { data } = await this.http.get(`/api/${name}/auth/qr`, {
        responseType: 'arraybuffer',
      });

      // Convert arraybuffer to base64
      const base64 = Buffer.from(data).toString('base64');

      return {
        mimetype: 'image/png',
        data: base64,
      };
    } catch (error) {
      this.handleError('getQrCode', error);
      throw error;
    }
  }

  // ── Messaging ─────────────────────────────────────────────────

  async sendText(
    session: string,
    chatId: string,
    text: string,
  ): Promise<WahaSendResponse> {
    try {
      const { data } = await this.http.post('/api/sendText', {
        session,
        chatId,
        text,
      });
      return data;
    } catch (error) {
      this.handleError('sendText', error);
      throw error;
    }
  }

  async sendFile(
    session: string,
    chatId: string,
    file: WahaFilePayload,
    caption?: string,
  ): Promise<WahaSendResponse> {
    try {
      const body: Record<string, unknown> = {
        session,
        chatId,
        file,
      };
      if (caption) {
        body.caption = caption;
      }
      const { data } = await this.http.post('/api/sendFile', body);
      return data;
    } catch (error) {
      this.handleError('sendFile', error);
      throw error;
    }
  }

  // ── Health ────────────────────────────────────────────────────

  async checkHealth(): Promise<boolean> {
    try {
      await this.http.get('/api/health');
      return true;
    } catch {
      return false;
    }
  }

  // ── Error Handling ────────────────────────────────────────────

  private handleError(operation: string, error: unknown): never {
    const axiosErr = error as AxiosError;
    const status = axiosErr?.response?.status;
    const detail = axiosErr?.response?.data;

    logger.error(`WAHA ${operation} failed`, {
      status,
      detail,
      message: (error as Error).message,
    });

    throw new ServiceUnavailableError(
      `WAHA ${operation} failed: ${(error as Error).message}`,
    );
  }
}
