const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  meta?: any;
}

interface RequestOptions {
  headers?: Record<string, string>;
}

class HttpService {
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem("token");
    return {
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async makeRequest<T = any>(
    endPoint: string,
    method: string,
    body?: any,
    auth: boolean = true,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${BASE_URL}${endPoint}`;

      const isFormData = body instanceof FormData;

      const headers: Record<string, string> = {
        ...(auth ? this.getAuthHeaders() : {}),
        ...options?.headers,
      };

      // IMPORTANT:
      // - Do NOT set Content-Type for FormData
      // - Browser sets multipart boundary automatically
      if (!isFormData) {
        headers["Content-Type"] = "application/json";
      }

      const config: RequestInit = {
        method,
        headers,
        ...(body && {
          body: isFormData ? body : JSON.stringify(body),
        }),
      };

      const response = await fetch(url, config);
      const data: ApiResponse<T> = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || `HTTP ${response.status}: ${response.statusText}`,
        );
      }

      return data;
    } catch (error: any) {
      console.error(`Api Error [${method} ${endPoint}]:`, error);
      throw error;
    }
  }

  /* ---------------- AUTH REQUESTS ---------------- */

  async getWithAuth<T = any>(
    endPoint: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endPoint, "GET", undefined, true, options);
  }

  async postWithAuth<T = any>(
    endPoint: string,
    body: any,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endPoint, "POST", body, true, options);
  }

  async putWithAuth<T = any>(
    endPoint: string,
    body: any,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endPoint, "PUT", body, true, options);
  }

  async deleteWithAuth<T = any>(
    endPoint: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endPoint, "DELETE", undefined, true, options);
  }

  /* ---------------- NON-AUTH REQUESTS ---------------- */

  async postWithoutAuth<T = any>(
    endPoint: string,
    body: any,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endPoint, "POST", body, false, options);
  }

  async getWithoutAuth<T = any>(
    endPoint: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endPoint, "GET", undefined, false, options);
  }

  /* ---------------- FORM DATA (UPLOADS) ---------------- */

  async postFormWithAuth<T = any>(
    endPoint: string,
    formData: FormData,
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(
      endPoint,
      "POST",
      formData,
      true,
      { headers: {} }, // allow browser to set multipart boundary
    );
  }
}

/* ---------------- EXPORTS ---------------- */

export const httpService = new HttpService();

export const getWithAuth = httpService.getWithAuth.bind(httpService);
export const postWithAuth = httpService.postWithAuth.bind(httpService);
export const putWithAuth = httpService.putWithAuth.bind(httpService);
export const deleteWithAuth = httpService.deleteWithAuth.bind(httpService);

export const postWithoutAuth = httpService.postWithoutAuth.bind(httpService);
export const getWithoutAuth = httpService.getWithoutAuth.bind(httpService);

export const postFormWithAuth = httpService.postFormWithAuth.bind(httpService);
