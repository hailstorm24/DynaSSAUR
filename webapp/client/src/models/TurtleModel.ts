export interface TurtleState {
  x: number;
  y: number;
  angle: number;
  penDown: boolean;
  color: string;
  visible: boolean;
}

export interface TurtleModel {
  state: TurtleState;
  commands: string[];
}
