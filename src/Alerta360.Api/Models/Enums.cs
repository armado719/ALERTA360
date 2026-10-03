namespace Alerta360.Api.Models;

public enum AssetStatus { Healthy, DegradedMinor, DegradedMajor, Critical, DataUnreliable }
public enum Vertical { Mineria, Hidroelectrica, Puerto }
public enum IncidentEventType { Degraded, Critical, Recovered, DataUnreliable }
