/// <reference types="nativewind/types" />

declare module "*.svg" {
  import type { ComponentType } from "react";
  import type { SvgProps } from "react-native-svg";
  const content: ComponentType<SvgProps>;
  export default content;
}

declare module "react-native-immediate-phone-call" {
  export default class RNImmediatePhoneCall {
    static immediatePhoneCall(number: string): void;
  }
}
