package kg.ademity.flowation_api_modulith.execution;

/**
 * Sentinel value stored in the runtime context when an extraction rule ran
 * but produced no result. Distinguishes "extracted nothing" from "variable
 * was never declared" — the latter is a configuration error caught by VariableResolver.
 */
public final class AbsentValue {
    public static final AbsentValue INSTANCE = new AbsentValue();
    private AbsentValue() {}
}
