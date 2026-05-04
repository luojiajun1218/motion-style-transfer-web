from PyQt5.QtWidgets import (QApplication, QMainWindow, QPushButton, 
                           QWidget, QVBoxLayout, QHBoxLayout, QLabel, QFrame,
                           QFileDialog, QSlider)
from PyQt5.QtCore import Qt, QTimer, QThread, pyqtSignal
from PyQt5.QtGui import QFont, QPalette, QColor
from PyQt5 import QtOpenGL
from OpenGL.GL import *
from OpenGL.GLUT import *
from OpenGL.GLU import *

import sys
import math
import os
from back.demo import style_transfer

# 注意：Skeleton 模块已移除，BVH可视化功能暂不可用
# 如需恢复，请将 BVH_visualizer/Skeleton.py 移回项目
# current_dir = os.path.dirname(os.path.abspath(__file__))
# bvh_visualizer_dir = os.path.join(current_dir, '..', 'data')
# sys.path.append(bvh_visualizer_dir)
Skeleton = None  # 占位符，避免导入错误


class BVHVisualizer(QtOpenGL.QGLWidget):
    def __init__(self, parent=None):
        # 初始化BVH可视化器，设置基本参数和OpenGL环境
        self.parent = parent
        self.frame = 0
        self.bvh_path = None
        self.skeleton = None
        self.offset = [0, 0, 0]
        QtOpenGL.QGLWidget.__init__(self, parent)
    
    def loadBVH(self, file_path):
        # 加载并解析BVH文件，初始化骨骼动画数据
        if file_path and os.path.exists(file_path):
            try:
                self.bvh_path = file_path
                self.skeleton = Skeleton(self.bvh_path, 0.25)
                self.skeleton.updateFrame(self.frame)
                self.offset = self.skeleton.root.worldpos
                self.updateGL()
                return True
            except Exception as e:
                print(f"加载BVH文件时出错: {e}")
                return False
        return False
    
    def initializeGL(self):
        # 初始化OpenGL环境，设置渲染参数
        glClearColor(0.2, 0.2, 0.2, 0.0)
        glClearDepth(1.0)
        glDepthFunc(GL_LESS)
        glEnable(GL_DEPTH_TEST)
        glShadeModel(GL_SMOOTH)
    
    def updateFrame(self, frame):
        # 更新当前动画帧，刷新骨骼位置
        if self.skeleton:
            self.frame = frame
            self.skeleton.updateFrame(self.frame)
            self.updateGL()
    
    def resizeGL(self, width, height):
        # 处理窗口大小变化，调整OpenGL视口和投影矩阵
        glViewport(0, 0, width, height)
        glMatrixMode(GL_PROJECTION)
        glLoadIdentity()
        aspect = width / float(height)
        gluPerspective(45.0, aspect, 1.0, 100.0)
        glMatrixMode(GL_MODELVIEW)
    
    def paintGL(self):
        # 执行OpenGL渲染，绘制地面和骨骼动画
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT)
        glLoadIdentity()
        
        glTranslatef(0.0, 1.0, -15.0)
        
        self.drawFloorPlane(-20, 20, 10, -5, True)
        
        if self.skeleton:
            self.drawBVHRig(self.skeleton)
    
    def drawFloorPlane(self, pmin, pmax, lines=10, y=0, faces=False):
        # 绘制地面网格，包括线条和面
        OFFSET = 0.2
        if faces:
            glColor3f(.3, .3, .3)
            glBegin(GL_QUADS)
            glVertex3f(pmin, y-OFFSET, pmin)
            glVertex3f(pmin, y-OFFSET, pmax)
            glVertex3f(pmax, y-OFFSET, pmax)
            glVertex3f(pmax, y-OFFSET, pmin)
            glEnd()

        size = pmax-pmin

        glLineWidth(2)
        glBegin(GL_LINES)
        for i in range(lines):
            if i == 0:
                glColor3f(.6, .3, .3)
            else:
                glColor3f(.25, .25, .25)
            pos = pmin + i*(size/lines)
            glVertex3f(pos, y, pmin)
            glVertex3f(pos, y, pmax)
            if i == 0:
                glColor3f(.3, .3, .6)
            else:
                glColor3f(.25, .25, .25)
            glVertex3f(pmin, y, pos)
            glVertex3f(pmax, y, pos)
        glEnd()
    
    def getPosition(self, joint):
        # 获取关节相对于根节点的位置
        return [joint.worldpos[0] - self.offset[0],
                joint.worldpos[1] - self.offset[1],
                joint.worldpos[2] - self.offset[2]]
    
    def drawSphere(self, r, lats, longs, wireFrame=False):
        # 绘制球体，用于表示关节
        for i in range(lats+1):
            lat0 = math.pi * ((-0.5 + float(i) - 1) / lats)
            z0 = math.sin(lat0)
            zr0 = math.cos(lat0)

            lat1 = math.pi * (-0.5 + float(i) / lats)
            z1 = math.sin(lat1)
            zr1 = math.cos(lat1)

            if wireFrame:
                glPolygonMode(GL_FRONT_AND_BACK, GL_LINE)
                glLineWidth(1)
                r = r + 0.0001

            glBegin(GL_QUAD_STRIP)
            for j in range(longs+1):
                lng = 2 * math.pi * float(j - 1) / longs
                x = math.cos(lng)
                y = math.sin(lng)

                glNormal3f(x * zr0 * r, y * zr0 * r, z0 * r)
                glVertex3f(x * zr0 * r, y * zr0 * r, z0 * r)
                glNormal3f(x * zr1 * r, y * zr1 * r, z1 * r)
                glVertex3f(x * zr1 * r, y * zr1 * r, z1 * r)
            glEnd()

            glPolygonMode(GL_FRONT_AND_BACK, GL_FILL)
    
    def drawJoint(self, joint):
        # 绘制单个关节及其连接线
        if not hasattr(joint, 'worldpos'):
            print(f"警告: 关节缺少worldpos属性")
            return
            
        self.offset = self.skeleton.root.worldpos
        pos = self.getPosition(joint)
        RADIUS = 0.15

        glPushMatrix()
        glTranslatef(pos[0], pos[1], pos[2])
        glColor3f(0.7, 0.3, 0.2)
        self.drawSphere(RADIUS, 8, 8)
        glColor3f(0.0, 0.0, 0.0)
        self.drawSphere(RADIUS, 8, 8, True)

        glColor3f(0.7, 0.3, 0.2)
        glPopMatrix()

        if joint.parent:
            head = self.getPosition(joint.parent)
            tail = pos
            glLineWidth(3)
            glBegin(GL_LINES)
            glVertex3f(head[0], head[1], head[2])
            glVertex3f(tail[0], tail[1], tail[2])
            glEnd()

        for child in joint.children:
            self.drawJoint(child)
    
    def drawBVHRig(self, skeleton):
        # 绘制完整的骨骼动画系统
        if not hasattr(skeleton, 'root'):
            print("警告: 骨架缺少root属性")
            return
            
        glColor3f(0.7, 0.3, 0.2)
        self.drawJoint(skeleton.root)


class StyleTransferThread(QThread):
    finished = pyqtSignal(str)
    error = pyqtSignal(str)
    
    def __init__(self, source_path, style_path, result_path):
        super().__init__()
        self.source_path = source_path
        self.style_path = style_path
        self.result_path = result_path
        
    def run(self):
        try:
            style_transfer(self.source_path, self.style_path, self.result_path)
            self.finished.emit(self.result_path)
        except Exception as e:
            self.error.emit(str(e))


class MotionStyleWindow(QMainWindow):
    def __init__(self):
        # 初始化主窗口，设置UI布局和样式
        super().__init__()
        self.setWindowTitle("Motion Style Transfer")
        self.setGeometry(100, 100, 1400, 900)
        self.setStyleSheet("""
            QMainWindow {
                background-color: #2b2b2b;
            }
            QPushButton {
                background-color: #4a90e2;
                color: white;
                border: none;
                border-radius: 5px;
                padding: 10px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #357abd;
            }
            QPushButton:pressed {
                background-color: #2d6da3;
            }
            QSlider::groove:horizontal {
                border: 1px solid #999999;
                height: 8px;
                background: #4a4a4a;
                margin: 2px 0;
                border-radius: 4px;
            }
            QSlider::handle:horizontal {
                background: #4a90e2;
                border: 1px solid #5c5c5c;
                width: 18px;
                margin: -2px 0;
                border-radius: 9px;
            }
        """)
        
        # 创建主窗口部件
        main_widget = QWidget()
        self.setCentralWidget(main_widget)
        
        # 创建主布局
        main_layout = QVBoxLayout()
        main_layout.setSpacing(20)
        main_layout.setContentsMargins(30, 30, 30, 30)
        
        # 创建标题
        title_label = QLabel("动作风格迁移系统")
        title_label.setStyleSheet("""
            color: white;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
        """)
        title_label.setAlignment(Qt.AlignCenter)
        main_layout.addWidget(title_label)
        
        # 添加保存路径设置区域 - 重新设计
        save_path_frame = QFrame()
        save_path_frame.setFrameStyle(QFrame.StyledPanel)
        save_path_frame.setStyleSheet("""
            QFrame {
                background-color: #363636;
                border-radius: 10px;
                padding: 12px;
                margin-bottom: 15px;
            }
        """)
        
        save_path_layout = QHBoxLayout(save_path_frame)
        save_path_layout.setContentsMargins(15, 12, 15, 12)
        save_path_layout.setSpacing(12)
        
        # 创建图标和路径显示的容器
        path_container = QHBoxLayout()
        path_container.setSpacing(8)
        
        # 创建文件夹图标
        path_icon_label = QLabel("📁")
        path_icon_label.setStyleSheet("""
            color: #4a90e2;
            font-size: 20px;
            margin-right: 5px;
        """)
        
        # 创建保存路径文本框
        self.save_path_display = QLabel(os.getcwd())
        self.save_path_display.setStyleSheet("""
            background-color: #2b2b2b;
            color: #e0e0e0;
            padding: 0px 15px;
            border-radius: 6px;
            font-size: 13px;
            border: none;
        """)
        self.save_path_display.setMinimumWidth(600)
        self.save_path_display.setMinimumHeight(40)
        self.save_path_display.setAlignment(Qt.AlignVCenter | Qt.AlignLeft)
        
        # 创建更改路径按钮
        self.change_path_btn = QPushButton("更改路径")
        self.change_path_btn.setStyleSheet("""
            QPushButton {
                background-color: #4a90e2;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 10px 20px;
                font-weight: bold;
                font-size: 13px;
            }
            QPushButton:hover {
                background-color: #357abd;
            }
            QPushButton:pressed {
                background-color: #2d6da3;
            }
        """)
        self.change_path_btn.setFixedSize(120, 40)
        self.change_path_btn.setCursor(Qt.PointingHandCursor)
        self.change_path_btn.clicked.connect(self.change_save_path)
        
        # 添加到布局
        path_container.addWidget(path_icon_label)
        path_container.addWidget(self.save_path_display, 1)
        path_container.addWidget(self.change_path_btn)
        
        save_path_layout.addLayout(path_container)
        main_layout.addWidget(save_path_frame)
        
        # 创建预览窗口区域
        preview_layout = QHBoxLayout()
        preview_layout.setSpacing(20)
        
        # 创建三个预览窗口
        preview_titles = ["源动作预览", "风格动作预览", "结果预览"]
        self.preview_containers = []
        self.visualizers = []
        self.sliders = []
        
        for i, title in enumerate(preview_titles):
            container = QFrame()
            container.setFrameStyle(QFrame.StyledPanel)
            container.setStyleSheet("""
                QFrame {
                    background-color: #363636;
                    border-radius: 10px;
                    padding: 10px;
                }
            """)
            
            layout = QVBoxLayout(container)
            
            title_label = QLabel(title)
            title_label.setStyleSheet("""
                color: #e0e0e0;
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 10px;
            """)
            title_label.setAlignment(Qt.AlignCenter)
            
            # 创建BVH可视化窗口
            visualizer = BVHVisualizer()
            visualizer.setMinimumSize(400, 500)
            
            # 创建帧滑动条
            slider = QSlider(Qt.Horizontal)
            slider.setMinimum(0)
            slider.setMaximum(100)  # 默认最大帧数
            slider.setValue(0)
            slider.setEnabled(False)  # 初始禁用
            
            # 连接滑动条到可视化器
            slider.valueChanged.connect(lambda val, vis=visualizer: vis.updateFrame(val))
            
            layout.addWidget(title_label)
            layout.addWidget(visualizer)
            layout.addWidget(slider)
            
            preview_layout.addWidget(container)
            self.preview_containers.append(container)
            self.visualizers.append(visualizer)
            self.sliders.append(slider)
        
        # 创建按钮区域
        button_layout = QHBoxLayout()
        button_layout.setSpacing(15)
        
        # 创建按钮
        self.source_btn = QPushButton("选择源动作")
        self.style_btn = QPushButton("选择风格动作")
        self.transfer_btn = QPushButton("开始迁移")
        
        for btn in [self.source_btn, self.style_btn, self.transfer_btn]:
            btn.setMinimumSize(180, 45)
            btn.setFont(QFont("Arial", 11))
            button_layout.addWidget(btn)
        
        # 将所有布局添加到主布局
        main_layout.addLayout(preview_layout)
        main_layout.addLayout(button_layout)
        
        # 设置主布局到主窗口
        main_widget.setLayout(main_layout)
        
        # 连接按钮信号
        self.source_btn.clicked.connect(self.select_source)
        self.style_btn.clicked.connect(self.select_style)
        self.transfer_btn.clicked.connect(self.start_transfer)
        
        # 设置定时器更新OpenGL窗口
        self.timer = QTimer(self)
        self.timer.setInterval(20)  # 20毫秒
        self.timer.timeout.connect(self.update_visualizers)
        self.timer.start()
        
        # 存储文件路径
        self.source_path = None
        self.style_path = None
        self.result_path = None
        self.save_path = os.getcwd()  # 默认保存路径为当前目录
        self.transfer_thread = None

    def update_visualizers(self):
        # 更新所有可视化器的显示
        for visualizer in self.visualizers:
            if visualizer.skeleton:
                visualizer.updateGL()

    def select_source(self):
        # 选择源动作BVH文件并加载到第一个可视化器
        file_path, _ = QFileDialog.getOpenFileName(
            self,
            "选择源动作BVH文件",
            "",
            "BVH Files (*.bvh);;All Files (*)"
        )
        if file_path:
            self.source_path = file_path
            print(f"尝试加载源动作文件: {file_path}")
            
            # 加载BVH文件到可视化器
            if self.visualizers[0].loadBVH(file_path):
                # 获取帧数
                try:
                    if hasattr(self.visualizers[0].skeleton, 'frames'):
                        if isinstance(self.visualizers[0].skeleton.frames, int):
                            max_frames = self.visualizers[0].skeleton.frames - 1
                        else:
                            max_frames = len(self.visualizers[0].skeleton.frames) - 1
                    else:
                        max_frames = 100
                except Exception as e:
                    print(f"获取帧数时出错: {e}")
                    max_frames = 100
                
                self.sliders[0].setMaximum(max_frames)
                self.sliders[0].setEnabled(True)
                print(f"已加载源动作文件: {file_path}")
                print(f"总帧数: {max_frames + 1}")
            else:
                print(f"加载源动作文件失败: {file_path}")
    
    def select_style(self):
        # 选择风格动作BVH文件并加载到第二个可视化器
        file_path, _ = QFileDialog.getOpenFileName(
            self,
            "选择风格动作BVH文件",
            "",
            "BVH Files (*.bvh);;All Files (*)"
        )
        if file_path:
            self.style_path = file_path
            print(f"尝试加载风格动作文件: {file_path}")
            
            # 加载BVH文件到可视化器
            if self.visualizers[1].loadBVH(file_path):
                # 获取帧数
                try:
                    if hasattr(self.visualizers[1].skeleton, 'frames'):
                        if isinstance(self.visualizers[1].skeleton.frames, int):
                            max_frames = self.visualizers[1].skeleton.frames - 1
                        else:
                            max_frames = len(self.visualizers[1].skeleton.frames) - 1
                    else:
                        max_frames = 100
                except Exception as e:
                    print(f"获取帧数时出错: {e}")
                    max_frames = 100
                
                self.sliders[1].setMaximum(max_frames)
                self.sliders[1].setEnabled(True)
                print(f"已加载风格动作文件: {file_path}")
                print(f"总帧数: {max_frames + 1}")
            else:
                print(f"加载风格动作文件失败: {file_path}")
    
    def change_save_path(self):
        # 更改结果文件的保存路径
        folder_path = QFileDialog.getExistingDirectory(
            self,
            "选择保存路径",
            self.save_path
        )
        if folder_path:
            self.save_path = folder_path
            
            # 设置路径显示，如果路径太长则在中间显示省略号
            path_text = folder_path
            if len(path_text) > 60:
                # 保留路径的前部和后部，中间用...代替
                path_text = path_text[:30] + "..." + path_text[-27:]
            
            self.save_path_display.setText(path_text)
            
            # 添加视觉反馈 - 使用蓝色而不是绿色，与按钮颜色一致
            original_style = self.save_path_display.styleSheet()
            self.save_path_display.setStyleSheet("""
                background-color: #2b2b2b;
                color: #4a90e2;
                padding: 0px 15px;
                border-top-right-radius: 6px;
                border-bottom-right-radius: 6px;
                font-size: 13px;
                font-weight: bold;
                border: none;
            """)
            
            # 使用计时器恢复原来的样式
            QTimer.singleShot(1000, lambda: self.save_path_display.setStyleSheet(original_style))
            
            print(f"已更改保存路径: {folder_path}")
    
    def start_transfer(self):
        if not self.source_path or not self.style_path:
            print("请先选择源动作和风格动作文件")
            return
        
        # 禁用按钮并更改文本
        self.transfer_btn.setEnabled(False)
        self.transfer_btn.setText("迁移中...")
        
        # 生成结果文件名
        source_filename = os.path.basename(self.source_path)
        style_filename = os.path.basename(self.style_path)
        result_filename = f"result_{os.path.splitext(source_filename)[0]}_{os.path.splitext(style_filename)[0]}.bvh"
        result_path = os.path.join(self.save_path, result_filename)
        
        # 创建并启动风格迁移线程
        self.transfer_thread = StyleTransferThread(self.source_path, self.style_path, result_path)
        self.transfer_thread.finished.connect(self.on_transfer_finished)
        self.transfer_thread.error.connect(self.on_transfer_error)
        self.transfer_thread.start()
    
    def on_transfer_finished(self, result_path):
        self.result_path = result_path
        print(f"结果文件已保存至: {result_path}")
        
        if self.visualizers[2].loadBVH(self.result_path):
            try:
                if hasattr(self.visualizers[2].skeleton, 'frames'):
                    if isinstance(self.visualizers[2].skeleton.frames, int):
                        max_frames = self.visualizers[2].skeleton.frames - 1
                    else:
                        max_frames = len(self.visualizers[2].skeleton.frames) - 1
                else:
                    max_frames = 100
            except Exception as e:
                print(f"获取帧数时出错: {e}")
                max_frames = 100
            
            self.sliders[2].setMaximum(max_frames)
            self.sliders[2].setEnabled(True)
            # print("风格迁移完成")
            print(f"结果总帧数: {max_frames + 1}")
        else:
            print("加载结果文件失败")
        
        # 恢复按钮状态
        self.transfer_btn.setEnabled(True)
        self.transfer_btn.setText("开始迁移")
    
    def on_transfer_error(self, error_msg):
        print(f"风格迁移出错: {error_msg}")
        self.result_path = self.source_path  # 出错时使用源文件路径
        
        # 恢复按钮状态
        self.transfer_btn.setEnabled(True)
        self.transfer_btn.setText("开始迁移")


if __name__ == '__main__':
    import sys
    app = QApplication(sys.argv)
    window = MotionStyleWindow()
    window.show()
    sys.exit(app.exec_())