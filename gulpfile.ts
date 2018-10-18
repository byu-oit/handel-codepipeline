import gulp from 'gulp';
import ts from 'gulp-typescript';
const tsProject = ts.createProject('tsconfig.json');
import fs from 'fs-extra';
import mergeStream from 'merge-stream';
import path from 'path';
import runSeq from 'run-sequence';

gulp.task('clean', (done) => {
    fs.remove(path.join(__dirname, 'dist'), done);
});

gulp.task('build', (done) => {
    runSeq('clean', ['compile'], done);
});

gulp.task('compile', () => {
    const tsReporter = ts.reporter.defaultReporter();
    return mergeStream(
        tsProject.src().pipe(tsProject(tsReporter)),
        gulp.src(['src/**/*', '!src/**/*.ts'])
    )
    .pipe(gulp.dest('dist'));
});
