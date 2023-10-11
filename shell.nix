{ pkgs ? import <nixpkgs> {} }:
let
in
pkgs.mkShell {
    packages = [ pkgs.curl pkgs.deno pkgs.ffmpeg-full ];
}

