import{previewResponse}from'@/fixtures/preview';import type{ApiResponse}from'@shared/contracts'
export const isFixturePreview=import.meta.env.VITE_VITRUVIAN_FIXTURE_MODE==='true'
export async function getApi<T>(path:string,signal?:AbortSignal):Promise<T>{if(isFixturePreview)return previewResponse(path)as T;const response=await fetch(`/api/v1${path}`,{signal,headers:{Accept:'application/json'}});if(!response.ok)throw new Error('Observation service unavailable');return((await response.json())as ApiResponse<T>).data}
