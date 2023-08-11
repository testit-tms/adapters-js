export interface ITestStep {
  title: string;
  description?: string;
  parameters?: {
    [key: string]: string;
  };
}

export class TestStep implements ITestStep {
  public description?: string;
  public parameters?: { [p: string]: string };

  constructor(public title: string) {}
}
