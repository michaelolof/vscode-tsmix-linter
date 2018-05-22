'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { window, workspace, ExtensionContext, languages } from 'vscode';
import { checkIfFileIsUsingLibrary, App, validateAll, constants } from "tsmix-linter";
import { Diagnostic,} from 'ts-parser';
import { BuilderProgram, } from 'typescript';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext ) {

	let allDiagnostics:Diagnostic[] = [];
	let hasBeenInitialized = false;
	const diagnosticCollection = languages.createDiagnosticCollection( constants.appName );
	let program:BuilderProgram|undefined = undefined;
	let rootFiles:string[]|undefined;

	workspace.onDidOpenTextDocument( async _ => {
		const activeTextEditor = window.activeTextEditor;
		if( activeTextEditor === undefined ) return
		if( activeTextEditor.document.languageId !== "typescript" ) return;

		const isUsingTSMixLibrary = await checkIfFileIsUsingLibrary( activeTextEditor.document.fileName, activeTextEditor.document.getText() )
		if( isUsingTSMixLibrary === false ) return;

		if( hasBeenInitialized === true ) {
			if( program && rootFiles ) doneValidating( allDiagnostics );
			return;
		};

		let workspaceFolders = workspace.workspaceFolders
		if( workspaceFolders ) {
			const rootPath = workspaceFolders[0].uri.fsPath;
			App.launchWatcher( rootPath, builderProgram => {
				hasBeenInitialized = true;
				if( App.rootFiles ) {
					program = builderProgram
					rootFiles = App.rootFiles
					validateAll( program.getProgram(), App.rootFiles ).then( doneValidating );
				}
			})
		} else {
			App.launchCompiler( activeTextEditor.document.fileName ).then( doneValidating )
		}

	});

	workspace.onDidSaveTextDocument( _ => doneValidating( allDiagnostics ) )

	function doneValidating(diagnostics:Diagnostic[]) {
		allDiagnostics = diagnostics;
		if( allDiagnostics.length === 0 ) return;
		workspace.textDocuments.forEach( document => {
			const diagnostic = allDiagnostics.filter( diagnostic => {
				diagnostic.severity = 0;
				return diagnostic.filePath === document.fileName.replace(/\\/g, "/") 
			}) as any
			diagnosticCollection.set( document.uri, diagnostic );
		})
	}

}



// this method is called when your extension is deactivated
export function deactivate() {
}