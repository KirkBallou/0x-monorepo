import * as fs from 'fs';
import * as S from 'solidity-parser-antlr';

// TODO: Replace with Array.flatMap https://tc39.github.io/proposal-flatMap/#sec-Array.prototype.flatMap
export const flatMap = <A, B>(a: A[], f: ((a: A) => B[])): B[] => ([] as B[]).concat(...a.map(f));

// TODO: Use Map instead?
export const objectZip = <T>(keys: string[], values: T[]): { [key: string]: T } =>
    keys.reduce(
        (others, key, index) => ({
            ...others,
            [key]: values[index],
        }),
        {},
    );

// TODO: Is the order in Object.keys and Object.values equal?
export const objectMap = <A, B>(obj: { [key: string]: A }, f: (v: A) => B): { [key: string]: B } =>
    objectZip(Object.keys(obj), Object.values(obj).map(f));

export const objectPromise = async <T>(obj: { [key: string]: Promise<T> }): Promise<{ [key: string]: T }> =>
    objectZip(Object.keys(obj), await Promise.all(Object.values(obj)));

export const objectFilter = <A>(obj: { [key: string]: A }, f: (key: string, v: A) => boolean): { [key: string]: A } =>
    Object.keys(obj)
        .filter(key => f(key, obj[key]))
        .reduce((a, key) => ({ ...a, [key]: obj[key] }), {});

export class Deferred<T> {
    public promise: Promise<T>;
    public reject: (reason: any) => void;
    public resolve: (value: T) => void;
    constructor() {
        // Hack(recmo): Define reject and resolve here so TS does not complain
        //              about them not being defined in the constructor. The
        //              promise we create will overwrite them.
        this.reject = () => {
            throw new Error('Unimplemented reject.');
        };
        this.resolve = () => {
            throw new Error('Unimplemented resolve.');
        };
        this.promise = new Promise((resolve, reject) => {
            this.reject = reject;
            this.resolve = resolve;
        });
    }
}

export const existsAsync = (path: string): Promise<boolean> =>
    new Promise((resolve, reject) =>
        fs.access(path, fs.constants.R_OK, error => (error ? resolve(false) : resolve(true))),
    );

export const readFileAsync = (path: string): Promise<string> =>
    new Promise((resolve, reject) =>
        fs.readFile(path, 'utf-8', (error, contents) => (error ? reject(error) : resolve(contents))),
    );

export const writeFileAsync = (path: string, contents: string): Promise<void> =>
    new Promise((resolve, reject) =>
        fs.writeFile(path, contents, 'utf-8', error => (error ? reject(error) : resolve())),
    );

export const isPragmaDirective = (node: S.ASTNode): node is S.PragmaDirective =>
    node.type === S.NodeType.PragmaDirective;

export const isImportDirective = (node: S.ASTNode): node is S.ImportDirective =>
    node.type === S.NodeType.ImportDirective;

export const isContractDefinition = (node: S.ASTNode): node is S.ContractDefinition =>
    node.type === S.NodeType.ContractDefinition;

export const pragmaNodes = (ast: S.SourceUnit): S.PragmaDirective[] => ast.children.filter(isPragmaDirective);

export const importNodes = (ast: S.SourceUnit): S.ImportDirective[] => ast.children.filter(isImportDirective);

export const contracts = (ast: S.SourceUnit): S.ContractDefinition[] => ast.children.filter(isContractDefinition);

export const identifier = (name: string): S.Identifier => ({
    type: S.NodeType.Identifier,
    name,
});

export const elementaryType = (name: string): S.ElementaryTypeName => ({
    type: S.NodeType.ElementaryTypeName,
    name,
});

export const userType = (name: string): S.UserDefinedTypeName => ({
    type: S.NodeType.UserDefinedTypeName,
    namePath: name,
});

export const types = {
    bool: elementaryType('bool'),
    uint256: elementaryType('uint256'),
};

export const litBool = (value: boolean): S.BooleanLiteral => ({
    type: S.NodeType.BooleanLiteral,
    value,
});

export const litFalse = litBool(false);

export const litTrue = litBool(true);

export const isNumber = (value: string | number): value is number => typeof value === 'number';

const hexadecimalBase = 16;

export const litNumber = (value: string | number): S.NumberLiteral => ({
    type: S.NodeType.NumberLiteral,
    number: isNumber(value) ? `0x${value.toString(hexadecimalBase)}` : value,
    subdenomination: null,
});

export const litString = (value: string): S.StringLiteral => ({
    type: S.NodeType.StringLiteral,
    value,
});

export type Litteral = string | number;

export const litteral = (value: Litteral): S.Expression => {
    if (isNumber(value)) {
        return litNumber(value);
    }
    if (value.startsWith('"')) {
        return litString(value.slice(1, -1));
    }
    if (value === 'true') {
        return litTrue;
    }
    if (value === 'false') {
        return litFalse;
    }
    return litNumber(value);
};

export const nameParameters = (params: S.ParameterList, prefix: string = '_arg'): S.ParameterList => ({
    ...params,
    parameters: params.parameters.map((param, i) => ({
        ...param,
        name: param.name || `${prefix}${i}`,
    })),
});

export const argumentExpressions = (params: S.ParameterList): S.Expression[] =>
    params.parameters.map(({ name }) => {
        // TODO: rewrite using throw expressions or do notation
        if (name !== null) {
            return identifier(name);
        } else {
            throw new Error('Anonymous parameter');
        }
    });