import { TurboModuleRegistry, type TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  multiply(a: number, b: number): number;
  syncUIRender(): Promise<boolean>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('HandelNativeEvent');
