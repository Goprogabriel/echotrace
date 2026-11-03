import type {DecodedAudio, FitResult, FlightDataset, Progress, SearchConfig, SignalAnalysis, SignalOptions, SpectrumView} from './types.js';
export type Stage = 'idle' | 'decoding' | 'analyzing' | 'ready' | 'fetching' | 'matching' | 'done' | 'error';
export interface AppState {
  file: File | null; blobUrl: string; stage: Stage; error: string; progress: Progress;
  analysis: SignalAnalysis | null; dataset: FlightDataset | null; result: FitResult | null;
  decoded: Omit<DecodedAudio,'samples'> | null; config: SearchConfig | null;
  form: Record<string,string>; consent: boolean; network: boolean;
  waveform: Float32Array | null; demo: boolean; canFallback: boolean; selected: number;
  sensitivity: number; signalOptions: SignalOptions; spectrumView: SpectrumView; selectedTracks: string[];
}
export const isBusy = (state: AppState): boolean => ['decoding','analyzing','fetching','matching'].includes(state.stage);
export function initialState(): AppState {
  return {file:null,blobUrl:'',stage:'idle',error:'',progress:{phase:'idle',text:'Klar til en optagelse',progress:0},analysis:null,dataset:null,result:null,decoded:null,config:null,
    form:{date:'',clock:'0',altitude:'0',sound:'343'},consent:false,network:false,waveform:null,demo:false,canFallback:false,selected:0,
    sensitivity:50,signalOptions:{fftSize:8192,minHz:30,maxHz:1000},spectrumView:{start:0,end:0,minHz:30,maxHz:1000,gain:0},selectedTracks:[]};
}
